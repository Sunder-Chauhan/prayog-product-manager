import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/ops-utils";

export const Route = createFileRoute("/_authenticated/ops/inventory")({
  component: OpsInventory,
});

function OpsInventory() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows } = useQuery({
    queryKey: ["ops-inventory"],
    queryFn: async () => {
      const [{ data: products }, { data: inv }] = await Promise.all([
        supabase.from("products").select("id, name, sku, base_price, is_published").order("sort_order"),
        supabase.from("inventory").select("*"),
      ]);
      const map = new Map((inv ?? []).filter((i) => !i.variant_id).map((i) => [i.product_id, i]));
      return (products ?? []).map((p) => ({ product: p, inv: map.get(p.id) ?? null }));
    },
  });

  const { data: movements } = useQuery({
    queryKey: ["ops-movements"],
    queryFn: async () =>
      (await supabase
        .from("stock_movements")
        .select("*, products(name)")
        .order("created_at", { ascending: false })
        .limit(25)).data ?? [],
  });

  async function ensureRow(productId: string) {
    const { data } = await supabase.from("inventory").select("id").eq("product_id", productId).is("variant_id", null).maybeSingle();
    if (data) return data.id as string;
    const { data: created, error } = await supabase.from("inventory").insert({ product_id: productId }).select("id").single();
    if (error) throw error;
    return created.id as string;
  }

  async function adjust(productId: string, delta: number) {
    setBusy(productId);
    try {
      const id = await ensureRow(productId);
      const { data: cur } = await supabase.from("inventory").select("on_hand").eq("id", id).single();
      const next = Math.max(0, Number(cur?.on_hand ?? 0) + delta);
      await supabase.from("inventory").update({ on_hand: next }).eq("id", id);
      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("stock_movements").insert({
        product_id: productId, delta, reason: delta > 0 ? "stock_in" : "stock_out", created_by: auth.user?.id ?? null,
      });
      qc.invalidateQueries({ queryKey: ["ops-inventory"] });
      qc.invalidateQueries({ queryKey: ["ops-movements"] });
      qc.invalidateQueries({ queryKey: ["ops-cockpit"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update stock");
    }
    setBusy(null);
  }

  async function setField(productId: string, field: "reorder_level" | "unit_cost" | "location", value: string) {
    try {
      const id = await ensureRow(productId);
      const patch =
        field === "location"
          ? { location: value || "Studio" }
          : field === "reorder_level"
            ? { reorder_level: Number(value || 0) }
            : { unit_cost: value === "" ? null : Number(value) };
      await supabase.from("inventory").update(patch).eq("id", id);
      qc.invalidateQueries({ queryKey: ["ops-inventory"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  }

  const totalValue = (rows ?? []).reduce((s, r) => s + Number(r.inv?.on_hand ?? 0) * Number(r.inv?.unit_cost ?? 0), 0);
  const lowCount = (rows ?? []).filter((r) => Number(r.inv?.on_hand ?? 0) <= Number(r.inv?.reorder_level ?? 0)).length;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="h-display text-2xl">Inventory</h2>
        <div className="text-xs text-muted-foreground">Stock value {inr(totalValue)} · {lowCount} need restocking</div>
      </div>

      <div className="mt-6 overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="p-3 font-medium">Product</th>
              <th className="p-3 font-medium text-center">On hand</th>
              <th className="p-3 font-medium text-center">Reserved</th>
              <th className="p-3 font-medium text-center">Reorder at</th>
              <th className="p-3 font-medium text-right">Unit cost</th>
              <th className="p-3 font-medium">Location</th>
              <th className="p-3 font-medium text-right">Adjust</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map(({ product, inv }) => {
              const low = Number(inv?.on_hand ?? 0) <= Number(inv?.reorder_level ?? 0);
              return (
                <tr key={product.id} className="border-t border-border">
                  <td className="p-3">
                    <div>{product.name}</div>
                    <div className="text-[11px] font-mono text-muted-foreground">{product.sku ?? "—"}</div>
                  </td>
                  <td className={`p-3 text-center font-medium ${low ? "text-destructive" : ""}`}>{inv?.on_hand ?? 0}</td>
                  <td className="p-3 text-center text-muted-foreground">{inv?.reserved ?? 0}</td>
                  <td className="p-3 text-center">
                    <input type="number" defaultValue={inv?.reorder_level ?? 5}
                      onBlur={(e) => setField(product.id, "reorder_level", e.target.value)}
                      className="w-16 bg-background border border-input rounded-sm px-2 py-1 text-center text-xs" />
                  </td>
                  <td className="p-3 text-right">
                    <input type="number" defaultValue={inv?.unit_cost ?? ""}
                      onBlur={(e) => setField(product.id, "unit_cost", e.target.value)}
                      className="w-24 bg-background border border-input rounded-sm px-2 py-1 text-right text-xs" />
                  </td>
                  <td className="p-3">
                    <input defaultValue={inv?.location ?? "Studio"}
                      onBlur={(e) => setField(product.id, "location", e.target.value)}
                      className="w-28 bg-background border border-input rounded-sm px-2 py-1 text-xs" />
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button disabled={busy === product.id} onClick={() => adjust(product.id, -1)} className="px-2 border border-border rounded-sm">−</button>
                    <button disabled={busy === product.id} onClick={() => adjust(product.id, 1)} className="px-2 border border-border rounded-sm ml-1">+</button>
                    <button disabled={busy === product.id} onClick={() => adjust(product.id, 10)} className="px-2 border border-border rounded-sm ml-1 text-xs">+10</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="h-display text-lg mt-10">Recent stock movements</h3>
      <div className="mt-3 border border-border rounded-sm divide-y divide-border">
        {(movements ?? []).map((m) => (
          <div key={m.id} className="p-3 flex items-center justify-between text-sm">
            <span>{m.products?.name ?? "—"}</span>
            <span className="text-xs text-muted-foreground">
              {m.delta > 0 ? "+" : ""}{m.delta} · {m.reason.replaceAll("_", " ")} · {new Date(m.created_at).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {(movements ?? []).length === 0 && <div className="p-4 text-xs text-muted-foreground">No movements logged yet.</div>}
      </div>
    </div>
  );
}

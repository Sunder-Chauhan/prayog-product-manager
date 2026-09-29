import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["order_status"];
const STATUSES: Status[] = ["whatsapp_sent","confirmed","quotation_sent","payment_pending","payment_received","in_production","packed","shipped","delivered","completed","cancelled"];

export const Route = createFileRoute("/_authenticated/ops/orders")({
  component: OpsOrders,
});

function OpsOrders() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["ops-orders"],
    queryFn: async () => (await supabase.from("orders").select("*, order_items(product_name, quantity)").order("created_at", { ascending: false })).data ?? [],
  });
  async function setStatus(id: string, s: Status) {
    await supabase.from("orders").update({ status: s }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ops-orders"] });
  }
  return (
    <div>
      <h2 className="h-display text-2xl">Orders</h2>
      <div className="mt-6 space-y-3">
        {(data ?? []).map((o) => (
          <div key={o.id} className="border border-border rounded-sm p-5 grid gap-3 md:grid-cols-[1fr_auto]">
            <div>
              <div className="text-sm font-medium">{o.order_number} · {o.customer_name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{o.customer_phone} · {o.customer_email}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {(o.order_items ?? []).map((i: { product_name: string; quantity: number }) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(o.created_at).toLocaleString("en-IN")} · {o.items_count} items
                {o.subtotal ? ` · indicative ₹${Number(o.subtotal).toLocaleString("en-IN")}` : ""}
              </div>
            </div>
            <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value as Status)}
              className="bg-background border border-input rounded-sm px-3 py-2 text-xs uppercase tracking-widest h-fit">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </select>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No orders yet.</p>}
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { inr } from "@/lib/ops-utils";

export const Route = createFileRoute("/_authenticated/ops/live")({
  component: OpsLive,
});

type Event = { at: string; kind: string; text: string; meta?: string };

function OpsLive() {
  const { data, dataUpdatedAt } = useQuery({
    queryKey: ["ops-live"],
    refetchInterval: 15_000,
    queryFn: async (): Promise<Event[]> => {
      const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
      const [orders, quotes, carts, wishes, profiles, payments, moves] = await Promise.all([
        supabase.from("orders").select("order_number, customer_name, status, subtotal, created_at").gte("created_at", since),
        supabase.from("quotations").select("quote_number, contact_name, status, created_at").gte("created_at", since),
        supabase.from("cart_items").select("quantity, created_at, products(name)").gte("created_at", since),
        supabase.from("wishlist").select("created_at, products(name)").gte("created_at", since),
        supabase.from("profiles").select("full_name, created_at").gte("created_at", since),
        supabase.from("payments").select("amount, method, created_at").gte("created_at", since),
        supabase.from("stock_movements").select("delta, reason, created_at, products(name)").gte("created_at", since),
      ]);
      const ev: Event[] = [
        ...(orders.data ?? []).map((o) => ({ at: o.created_at, kind: "Order", text: `${o.order_number} · ${o.customer_name}`, meta: `${o.status.replaceAll("_", " ")}${o.subtotal ? ` · ${inr(Number(o.subtotal))}` : ""}` })),
        ...(quotes.data ?? []).map((q) => ({ at: q.created_at, kind: "Quote", text: `${q.quote_number} · ${q.contact_name}`, meta: q.status })),
        ...(carts.data ?? []).map((c) => ({ at: c.created_at, kind: "Cart", text: `${c.quantity}× ${c.products?.name ?? "product"} added` })),
        ...(wishes.data ?? []).map((w) => ({ at: w.created_at, kind: "Wishlist", text: `${w.products?.name ?? "product"} saved` })),
        ...(profiles.data ?? []).map((p) => ({ at: p.created_at, kind: "Signup", text: p.full_name ?? "New customer" })),
        ...(payments.data ?? []).map((p) => ({ at: p.created_at, kind: "Payment", text: inr(Number(p.amount)), meta: p.method.replaceAll("_", " ") })),
        ...(moves.data ?? []).map((m) => ({ at: m.created_at, kind: "Stock", text: `${m.delta > 0 ? "+" : ""}${m.delta} ${m.products?.name ?? ""}`, meta: m.reason.replaceAll("_", " ") })),
      ];
      return ev.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 100);
    },
  });

  const today = (data ?? []).filter((e) => new Date(e.at).toDateString() === new Date().toDateString());

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="h-display text-2xl">Live activity</h2>
        <span className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
          updated {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-IN") : "—"}
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { l: "Events today", v: today.length },
          { l: "Last 30 days", v: (data ?? []).length },
          { l: "Orders today", v: today.filter((e) => e.kind === "Order").length },
        ].map((c) => (
          <div key={c.l} className="border border-border rounded-sm p-5 bg-card">
            <div className="eyebrow">{c.l}</div>
            <div className="mt-2 h-display text-3xl">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-border rounded-sm divide-y divide-border">
        {(data ?? []).map((e, idx) => (
          <div key={idx} className="p-3 flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-3 min-w-0">
              <span className="eyebrow w-20 shrink-0">{e.kind}</span>
              <span className="truncate">{e.text}</span>
            </div>
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
              {e.meta ? `${e.meta} · ` : ""}{new Date(e.at).toLocaleString("en-IN")}
            </span>
          </div>
        ))}
        {(data ?? []).length === 0 && <div className="p-4 text-xs text-muted-foreground">No activity in the last 30 days.</div>}
      </div>
    </div>
  );
}

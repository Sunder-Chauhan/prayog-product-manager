import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/account/orders")({
  component: OrdersPage,
});

const STATUS_LABEL: Record<string, string> = {
  whatsapp_sent: "WhatsApp sent", confirmed: "Confirmed", quotation_sent: "Quotation sent",
  payment_pending: "Payment pending", payment_received: "Payment received",
  in_production: "In production", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", completed: "Completed", cancelled: "Cancelled",
};

function OrdersPage() {
  const { user } = useAuth();
  const { data: orders } = useQuery({
    queryKey: ["my-orders", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: quotes } = useQuery({
    queryKey: ["my-quotes", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="space-y-14">
      <div>
        <h2 className="h-display text-2xl">Orders</h2>
        {orders && orders.length > 0 ? (
          <div className="mt-6 divide-y divide-border border-t border-b border-border">
            {orders.map((o) => (
              <div key={o.id} className="py-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{o.order_number}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    · {o.items_count} items
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {(o.order_items ?? []).map((i: { product_name: string; quantity: number }) => `${i.quantity}× ${i.product_name}`).join(", ")}
                  </div>
                </div>
                <div className="text-xs uppercase tracking-widest text-accent">
                  {STATUS_LABEL[o.status] ?? o.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No orders yet.</p>
        )}
      </div>

      <div>
        <h2 className="h-display text-2xl">Quotations</h2>
        {quotes && quotes.length > 0 ? (
          <div className="mt-6 divide-y divide-border border-t border-b border-border">
            {quotes.map((q) => (
              <div key={q.id} className="py-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium">{q.quote_number}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(q.created_at).toLocaleDateString("en-IN")} · {q.project_type ?? "Bulk"}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground max-w-lg line-clamp-2">{q.message}</p>
                </div>
                <div className="text-xs uppercase tracking-widest text-accent">{q.status}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">No quotation requests yet.</p>
        )}
      </div>
    </div>
  );
}

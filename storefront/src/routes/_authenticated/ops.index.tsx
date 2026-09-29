import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { inr, lastMonths, monthKey, monthLabel } from "@/lib/ops-utils";

export const Route = createFileRoute("/_authenticated/ops/")({
  component: OpsDashboard,
});

const PIE_COLORS = ["#8a7a5c", "#b9a888", "#6d6350", "#cbbfa5", "#3f3a30", "#9c8f75"];

function useCockpit() {
  return useQuery({
    queryKey: ["ops-cockpit"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const [orders, items, payments, expenses, inventory, quotes, customers, products] = await Promise.all([
        supabase.from("orders").select("id, created_at, status, subtotal, items_count, customer_name, order_number"),
        supabase.from("order_items").select("product_name, quantity, line_total"),
        supabase.from("payments").select("amount, received_on"),
        supabase.from("expenses").select("amount, tax_amount, entry_date, category"),
        supabase.from("inventory").select("on_hand, reserved, reorder_level, unit_cost, products(name, sku)"),
        supabase.from("quotations").select("id, status, created_at"),
        supabase.from("profiles").select("id, created_at"),
        supabase.from("products").select("id, is_published"),
      ]);
      return {
        orders: orders.data ?? [],
        items: items.data ?? [],
        payments: payments.data ?? [],
        expenses: expenses.data ?? [],
        inventory: inventory.data ?? [],
        quotes: quotes.data ?? [],
        customers: customers.data ?? [],
        products: products.data ?? [],
      };
    },
  });
}

function OpsDashboard() {
  const { data, isLoading } = useCockpit();

  const months = lastMonths(6);
  const revenueByMonth = new Map(months.map((m) => [m, 0]));
  const expenseByMonth = new Map(months.map((m) => [m, 0]));
  const ordersByMonth = new Map(months.map((m) => [m, 0]));

  (data?.payments ?? []).forEach((p) => {
    const k = monthKey(p.received_on);
    if (revenueByMonth.has(k)) revenueByMonth.set(k, (revenueByMonth.get(k) ?? 0) + Number(p.amount ?? 0));
  });
  (data?.expenses ?? []).forEach((e) => {
    const k = monthKey(e.entry_date);
    if (expenseByMonth.has(k)) expenseByMonth.set(k, (expenseByMonth.get(k) ?? 0) + Number(e.amount ?? 0) + Number(e.tax_amount ?? 0));
  });
  (data?.orders ?? []).forEach((o) => {
    const k = monthKey(o.created_at);
    if (ordersByMonth.has(k)) ordersByMonth.set(k, (ordersByMonth.get(k) ?? 0) + 1);
  });

  const trend = months.map((m) => ({
    month: monthLabel(m),
    revenue: revenueByMonth.get(m) ?? 0,
    expenses: expenseByMonth.get(m) ?? 0,
    profit: (revenueByMonth.get(m) ?? 0) - (expenseByMonth.get(m) ?? 0),
    orders: ordersByMonth.get(m) ?? 0,
  }));

  const statusCounts = new Map<string, number>();
  (data?.orders ?? []).forEach((o) => statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1));
  const statusData = [...statusCounts.entries()].map(([name, value]) => ({ name: name.replaceAll("_", " "), value }));

  const topMap = new Map<string, number>();
  (data?.items ?? []).forEach((i) => topMap.set(i.product_name, (topMap.get(i.product_name) ?? 0) + Number(i.quantity ?? 0)));
  const topProducts = [...topMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, qty]) => ({ name, qty }));

  const revenue = (data?.payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const spend = (data?.expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0) + Number(e.tax_amount ?? 0), 0);
  const pipeline = (data?.orders ?? [])
    .filter((o) => !["completed", "cancelled", "cart"].includes(o.status))
    .reduce((s, o) => s + Number(o.subtotal ?? 0), 0);
  const stockValue = (data?.inventory ?? []).reduce((s, i) => s + Number(i.on_hand ?? 0) * Number(i.unit_cost ?? 0), 0);
  const lowStock = (data?.inventory ?? []).filter((i) => Number(i.on_hand ?? 0) <= Number(i.reorder_level ?? 0));

  const kpis = [
    { label: "Revenue received", v: inr(revenue), sub: `${data?.payments.length ?? 0} payments` },
    { label: "Net profit", v: inr(revenue - spend), sub: `spend ${inr(spend)}` },
    { label: "Open pipeline", v: inr(pipeline), sub: `${data?.orders.length ?? 0} orders total` },
    { label: "Stock value", v: inr(stockValue), sub: `${lowStock.length} low-stock SKUs` },
    { label: "Live products", v: `${(data?.products ?? []).filter((p) => p.is_published).length}/${data?.products.length ?? 0}`, sub: "published" },
    { label: "Quotations", v: String(data?.quotes.length ?? 0), sub: `${(data?.quotes ?? []).filter((q) => q.status === "pending").length} pending` },
    { label: "Customers", v: String(data?.customers.length ?? 0), sub: "registered" },
    { label: "Units shipped", v: String((data?.items ?? []).reduce((s, i) => s + Number(i.quantity ?? 0), 0)), sub: "all-time line items" },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="h-display text-2xl">Cockpit</h2>
        <span className="text-xs text-muted-foreground">{isLoading ? "Loading…" : "Auto-refreshes every minute"}</span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((c) => (
          <div key={c.label} className="border border-border rounded-sm p-5 bg-card">
            <div className="eyebrow">{c.label}</div>
            <div className="mt-2 h-display text-2xl">{c.v}</div>
            <div className="text-[11px] text-muted-foreground mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 border border-border rounded-sm p-5 bg-card">
          <div className="eyebrow">Revenue vs expenses · 6 months</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} className="text-accent" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity={0} className="text-accent" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} tickFormatter={(v: number) => inr(v)} />
                <Tooltip formatter={(v) => inr(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="revenue" stroke="#8a7a5c" fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#b45f4d" fillOpacity={0.08} fill="#b45f4d" strokeWidth={2} />
                <Area type="monotone" dataKey="profit" stroke="#4c6b52" fillOpacity={0} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 bg-card">
          <div className="eyebrow">Orders by stage</div>
          <div className="h-64 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 border border-border rounded-sm p-5 bg-card">
          <div className="eyebrow">Top products · units</div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeOpacity={0.15} horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="name" width={140} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Bar dataKey="qty" fill="#8a7a5c" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 bg-card">
          <div className="eyebrow">Orders per month</div>
          <div className="h-56 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeOpacity={0.15} vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={30} />
                <Tooltip />
                <Bar dataKey="orders" fill="#6d6350" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="border border-border rounded-sm p-5 bg-card">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Restock alerts</div>
            <Link to="/ops/inventory" className="text-xs link-underline">Inventory →</Link>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {lowStock.length === 0 && <div className="text-muted-foreground text-xs">Everything is above reorder level.</div>}
            {lowStock.slice(0, 8).map((i, idx) => (
              <div key={idx} className="flex items-center justify-between border-t border-border pt-2 first:border-0 first:pt-0">
                <span>{i.products?.name ?? "—"}</span>
                <span className="text-xs text-muted-foreground">{i.on_hand} on hand · reorder at {i.reorder_level}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-sm p-5 bg-card">
          <div className="flex items-center justify-between">
            <div className="eyebrow">Latest orders</div>
            <Link to="/ops/orders" className="text-xs link-underline">Orders →</Link>
          </div>
          <div className="mt-3 space-y-2 text-sm">
            {(data?.orders ?? [])
              .slice()
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .slice(0, 8)
              .map((o) => (
                <div key={o.id} className="flex items-center justify-between border-t border-border pt-2 first:border-0 first:pt-0">
                  <span>{o.order_number} · {o.customer_name}</span>
                  <span className="text-xs text-muted-foreground uppercase tracking-widest">{o.status.replaceAll("_", " ")}</span>
                </div>
              ))}
            {(data?.orders ?? []).length === 0 && <div className="text-muted-foreground text-xs">No orders yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

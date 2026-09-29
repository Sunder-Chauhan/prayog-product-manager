import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { inr, lastMonths, monthKey, monthLabel } from "@/lib/ops-utils";

export const Route = createFileRoute("/_authenticated/ops/accounts")({
  component: OpsAccounts,
});

const CATEGORIES = ["materials", "kiln_firing", "labour", "packaging", "logistics", "marketing", "photography", "rent", "utilities", "software", "taxes", "other"];
const METHODS = ["bank_transfer", "upi", "cash", "card", "cheque", "cod"];

function OpsAccounts() {
  const qc = useQueryClient();
  const [expense, setExpense] = useState({ entry_date: new Date().toISOString().slice(0, 10), category: "materials", vendor: "", description: "", amount: "", tax_amount: "", is_paid: true });
  const [payment, setPayment] = useState({ received_on: new Date().toISOString().slice(0, 10), order_id: "", amount: "", method: "bank_transfer", reference: "" });

  const { data } = useQuery({
    queryKey: ["ops-accounts"],
    queryFn: async () => {
      const [expenses, payments, orders] = await Promise.all([
        supabase.from("expenses").select("*").order("entry_date", { ascending: false }),
        supabase.from("payments").select("*, orders(order_number, customer_name)").order("received_on", { ascending: false }),
        supabase.from("orders").select("id, order_number, customer_name, subtotal").order("created_at", { ascending: false }),
      ]);
      return { expenses: expenses.data ?? [], payments: payments.data ?? [], orders: orders.data ?? [] };
    },
  });

  async function addExpense() {
    if (!expense.amount) return toast.error("Enter an amount");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("expenses").insert({
      entry_date: expense.entry_date, category: expense.category, vendor: expense.vendor || null,
      description: expense.description || null, amount: Number(expense.amount),
      tax_amount: Number(expense.tax_amount || 0), is_paid: expense.is_paid, created_by: auth.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Expense recorded");
    setExpense({ ...expense, vendor: "", description: "", amount: "", tax_amount: "" });
    qc.invalidateQueries({ queryKey: ["ops-accounts"] });
    qc.invalidateQueries({ queryKey: ["ops-cockpit"] });
  }

  async function addPayment() {
    if (!payment.amount) return toast.error("Enter an amount");
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("payments").insert({
      received_on: payment.received_on, order_id: payment.order_id || null, amount: Number(payment.amount),
      method: payment.method, reference: payment.reference || null, created_by: auth.user?.id ?? null,
    });
    if (error) return toast.error(error.message);
    toast.success("Payment recorded");
    setPayment({ ...payment, amount: "", reference: "" });
    qc.invalidateQueries({ queryKey: ["ops-accounts"] });
    qc.invalidateQueries({ queryKey: ["ops-cockpit"] });
  }

  async function del(table: "expenses" | "payments", id: string) {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["ops-accounts"] });
    qc.invalidateQueries({ queryKey: ["ops-cockpit"] });
  }

  const months = lastMonths(6);
  const chart = months.map((m) => ({
    month: monthLabel(m),
    income: (data?.payments ?? []).filter((p) => monthKey(p.received_on) === m).reduce((s, p) => s + Number(p.amount ?? 0), 0),
    spend: (data?.expenses ?? []).filter((e) => monthKey(e.entry_date) === m).reduce((s, e) => s + Number(e.amount ?? 0) + Number(e.tax_amount ?? 0), 0),
  }));

  const income = (data?.payments ?? []).reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const spend = (data?.expenses ?? []).reduce((s, e) => s + Number(e.amount ?? 0) + Number(e.tax_amount ?? 0), 0);
  const inputTax = (data?.expenses ?? []).reduce((s, e) => s + Number(e.tax_amount ?? 0), 0);
  const unpaid = (data?.expenses ?? []).filter((e) => !e.is_paid).reduce((s, e) => s + Number(e.amount ?? 0), 0);

  return (
    <div>
      <h2 className="h-display text-2xl">Accounts</h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { l: "Income", v: inr(income) },
          { l: "Expenses", v: inr(spend) },
          { l: "Net", v: inr(income - spend) },
          { l: "Input tax / unpaid bills", v: `${inr(inputTax)} · ${inr(unpaid)}` },
        ].map((c) => (
          <div key={c.l} className="border border-border rounded-sm p-5 bg-card">
            <div className="eyebrow">{c.l}</div>
            <div className="mt-2 h-display text-2xl">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 border border-border rounded-sm p-5 bg-card">
        <div className="eyebrow">Cash flow · 6 months</div>
        <div className="h-60 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeOpacity={0.15} vertical={false} />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={60} tickFormatter={(v: number) => inr(v)} />
              <Tooltip formatter={(v) => inr(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="income" fill="#4c6b52" radius={[3, 3, 0, 0]} />
              <Bar dataKey="spend" fill="#b45f4d" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-border rounded-sm p-5">
          <h3 className="h-display text-lg">Record expense</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="date" className={i} value={expense.entry_date} onChange={(e) => setExpense({ ...expense, entry_date: e.target.value })} />
            <select className={i} value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replaceAll("_", " ")}</option>)}
            </select>
            <input className={i} placeholder="Vendor" value={expense.vendor} onChange={(e) => setExpense({ ...expense, vendor: e.target.value })} />
            <input className={i} placeholder="Description" value={expense.description} onChange={(e) => setExpense({ ...expense, description: e.target.value })} />
            <input type="number" className={i} placeholder="Amount ₹" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} />
            <input type="number" className={i} placeholder="GST ₹" value={expense.tax_amount} onChange={(e) => setExpense({ ...expense, tax_amount: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={expense.is_paid} onChange={(e) => setExpense({ ...expense, is_paid: e.target.checked })} /> Paid
            </label>
            <button onClick={addExpense} className={btn}>Add expense</button>
          </div>
        </div>

        <div className="border border-border rounded-sm p-5">
          <h3 className="h-display text-lg">Record payment received</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="date" className={i} value={payment.received_on} onChange={(e) => setPayment({ ...payment, received_on: e.target.value })} />
            <select className={i} value={payment.order_id} onChange={(e) => setPayment({ ...payment, order_id: e.target.value })}>
              <option value="">No linked order</option>
              {(data?.orders ?? []).map((o) => <option key={o.id} value={o.id}>{o.order_number} · {o.customer_name}</option>)}
            </select>
            <input type="number" className={i} placeholder="Amount ₹" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <select className={i} value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })}>
              {METHODS.map((m) => <option key={m} value={m}>{m.replaceAll("_", " ")}</option>)}
            </select>
            <input className={i} placeholder="Reference / UTR" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <button onClick={addPayment} className={btn}>Add payment</button>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="h-display text-lg">Expense ledger</h3>
          <div className="mt-3 border border-border rounded-sm divide-y divide-border">
            {(data?.expenses ?? []).map((e) => (
              <div key={e.id} className="p-3 flex items-center justify-between text-sm gap-3">
                <div>
                  <div>{e.description || e.category.replaceAll("_", " ")}</div>
                  <div className="text-[11px] text-muted-foreground">{e.entry_date} · {e.vendor ?? "—"} · {e.is_paid ? "paid" : "unpaid"}</div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div>{inr(Number(e.amount) + Number(e.tax_amount))}</div>
                  <button onClick={() => del("expenses", e.id)} className="text-[11px] link-underline text-destructive">Delete</button>
                </div>
              </div>
            ))}
            {(data?.expenses ?? []).length === 0 && <div className="p-4 text-xs text-muted-foreground">No expenses yet.</div>}
          </div>
        </div>

        <div>
          <h3 className="h-display text-lg">Payments received</h3>
          <div className="mt-3 border border-border rounded-sm divide-y divide-border">
            {(data?.payments ?? []).map((p) => (
              <div key={p.id} className="p-3 flex items-center justify-between text-sm gap-3">
                <div>
                  <div>{p.orders?.order_number ? `${p.orders.order_number} · ${p.orders.customer_name}` : (p.reference || "Direct payment")}</div>
                  <div className="text-[11px] text-muted-foreground">{p.received_on} · {p.method.replaceAll("_", " ")}</div>
                </div>
                <div className="text-right whitespace-nowrap">
                  <div>{inr(Number(p.amount))}</div>
                  <button onClick={() => del("payments", p.id)} className="text-[11px] link-underline text-destructive">Delete</button>
                </div>
              </div>
            ))}
            {(data?.payments ?? []).length === 0 && <div className="p-4 text-xs text-muted-foreground">No payments yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

const i = "w-full bg-background border border-input rounded-sm px-3 py-2 text-sm";
const btn = "text-xs uppercase tracking-widest border border-foreground px-4 py-2 rounded-sm hover:bg-foreground hover:text-background transition-colors";

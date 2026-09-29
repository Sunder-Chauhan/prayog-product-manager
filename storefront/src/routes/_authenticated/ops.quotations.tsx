import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Status = Database["public"]["Enums"]["quotation_status"];
const STATUSES: Status[] = ["pending","reviewing","sent","accepted","rejected","expired"];

export const Route = createFileRoute("/_authenticated/ops/quotations")({
  component: OpsQuotes,
});

function OpsQuotes() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["ops-quotes"],
    queryFn: async () => (await supabase.from("quotations").select("*").order("created_at", { ascending: false })).data ?? [],
  });
  async function setStatus(id: string, s: Status) {
    await supabase.from("quotations").update({ status: s }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["ops-quotes"] });
  }
  return (
    <div>
      <h2 className="h-display text-2xl">Quotations</h2>
      <div className="mt-6 space-y-3">
        {(data ?? []).map((q) => (
          <div key={q.id} className="border border-border rounded-sm p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{q.quote_number} · {q.contact_name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {q.contact_phone} · {q.contact_email}
                  {q.company_name && ` · ${q.company_name}`}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {q.project_type && `${q.project_type} · `}
                  {q.estimated_quantity && `Qty: ${q.estimated_quantity} · `}
                  {q.timeline && `Timeline: ${q.timeline}`}
                </div>
                <p className="mt-3 text-sm">{q.message}</p>
                <div className="text-xs text-muted-foreground mt-2">{new Date(q.created_at).toLocaleString("en-IN")}</div>
              </div>
              <select value={q.status} onChange={(e) => setStatus(q.id, e.target.value as Status)}
                className="bg-background border border-input rounded-sm px-3 py-2 text-xs uppercase tracking-widest h-fit">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        ))}
        {data && data.length === 0 && <p className="text-sm text-muted-foreground">No quote requests yet.</p>}
      </div>
    </div>
  );
}

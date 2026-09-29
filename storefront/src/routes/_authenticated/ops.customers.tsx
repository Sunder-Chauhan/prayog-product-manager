import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ops/customers")({
  component: OpsCustomers,
});

function OpsCustomers() {
  const { data } = useQuery({
    queryKey: ["ops-customers"],
    queryFn: async () => {
      const [{ data: profiles }, { data: orgs }] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("organizations").select("user_id, company_name, business_type, gst_number"),
      ]);
      const orgMap = new Map((orgs ?? []).map((o) => [o.user_id, o]));
      return (profiles ?? []).map((p) => ({ ...p, organization: orgMap.get(p.id) ?? null }));
    },
  });
  return (
    <div>
      <h2 className="h-display text-2xl">Customers</h2>
      <div className="mt-6 overflow-x-auto border border-border rounded-sm">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-left">
            <tr>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Phone</th>
              <th className="p-3 font-medium">Company</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Since</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3">{p.full_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.phone ?? "—"}</td>
                <td className="p-3">{p.organization?.company_name ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.organization?.business_type ?? (p.is_business ? "business" : "customer")}</td>
                <td className="p-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

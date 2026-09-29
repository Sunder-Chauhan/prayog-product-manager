import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account/addresses")({
  component: AddressesPage,
});

function AddressesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const { data } = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("addresses").select("*").eq("user_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="h-display text-2xl">Addresses</h2>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-1 text-xs uppercase tracking-widest text-accent">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {adding && <AddressForm onDone={() => { setAdding(false); qc.invalidateQueries({ queryKey: ["addresses"] }); }} />}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {(data ?? []).map((a) => (
          <div key={a.id} className="border border-border rounded-sm p-5 relative">
            <button onClick={async () => {
              await supabase.from("addresses").delete().eq("id", a.id);
              qc.invalidateQueries({ queryKey: ["addresses"] });
            }} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
            <div className="font-medium">{a.full_name}</div>
            <div className="text-sm text-muted-foreground">{a.phone}</div>
            <div className="mt-2 text-sm">
              {a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />
              {a.city}, {a.state} {a.pincode}<br />
              {a.country}
            </div>
          </div>
        ))}
        {data && data.length === 0 && !adding && (
          <p className="text-sm text-muted-foreground">No addresses saved.</p>
        )}
      </div>
    </div>
  );
}

function AddressForm({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({
    full_name: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("addresses").insert({ ...f, user_id: user.id });
    if (error) toast.error(error.message);
    else { toast.success("Address saved"); onDone(); }
  }
  return (
    <form onSubmit={save} className="mt-6 border border-border rounded-sm p-6 grid gap-4 md:grid-cols-2">
      {(["full_name", "phone", "line1", "line2", "city", "state", "pincode", "country"] as const).map((k) => (
        <label key={k} className={k === "line1" || k === "line2" ? "md:col-span-2 block" : "block"}>
          <span className="block eyebrow mb-2">{k.replace("_", " ")}</span>
          <input value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-2.5 text-sm" />
        </label>
      ))}
      <button className="md:col-span-2 mt-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
        Save address
      </button>
    </form>
  );
}

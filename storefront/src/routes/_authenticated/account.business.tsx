import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type BusinessType = Database["public"]["Enums"]["business_type"];

export const Route = createFileRoute("/_authenticated/account/business")({
  component: BusinessPage,
});

const TYPES: { value: BusinessType; label: string }[] = [
  { value: "hotel", label: "Hotel" }, { value: "resort", label: "Resort" },
  { value: "restaurant", label: "Restaurant" }, { value: "interior_designer", label: "Interior Designer" },
  { value: "architect", label: "Architect" }, { value: "retail_store", label: "Retail Store" },
  { value: "corporate_office", label: "Corporate Office" }, { value: "distributor", label: "Distributor" },
  { value: "builder", label: "Builder" }, { value: "real_estate", label: "Real Estate" },
  { value: "event_planner", label: "Event Planner" }, { value: "gifting_company", label: "Gifting Company" },
  { value: "other", label: "Other" },
];

function BusinessPage() {
  const { user } = useAuth();
  const [f, setF] = useState({
    company_name: "", gst_number: "", business_type: "other" as BusinessType,
    website: "", address: "", city: "", state: "", pincode: "",
  });
  const [saving, setSaving] = useState(false);
  const [exists, setExists] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("organizations").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        setExists(true);
        setF({
          company_name: data.company_name, gst_number: data.gst_number ?? "",
          business_type: data.business_type, website: data.website ?? "",
          address: data.address ?? "", city: data.city ?? "", state: data.state ?? "",
          pincode: data.pincode ?? "",
        });
      }
    });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const payload = { ...f, user_id: user.id };
    const { error } = exists
      ? await supabase.from("organizations").update(payload).eq("user_id", user.id)
      : await supabase.from("organizations").insert(payload);
    if (!error) {
      await supabase.from("profiles").update({ is_business: true }).eq("id", user.id);
      toast.success(exists ? "Business profile updated" : "Business profile added");
      setExists(true);
    } else toast.error(error.message);
    setSaving(false);
  }

  return (
    <div>
      <h2 className="h-display text-2xl">Business profile</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        Add your business details to unlock trade pricing and bulk order forms in your orders.
      </p>

      <form onSubmit={save} className="mt-8 grid gap-4 md:grid-cols-2 max-w-2xl">
        <label className="md:col-span-2 block">
          <span className="block eyebrow mb-2">Company name *</span>
          <input required value={f.company_name} onChange={(e) => setF({ ...f, company_name: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="block eyebrow mb-2">GST number</span>
          <input value={f.gst_number} onChange={(e) => setF({ ...f, gst_number: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="block eyebrow mb-2">Business type</span>
          <select value={f.business_type} onChange={(e) => setF({ ...f, business_type: e.target.value as BusinessType })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <label className="md:col-span-2 block">
          <span className="block eyebrow mb-2">Website</span>
          <input value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="md:col-span-2 block">
          <span className="block eyebrow mb-2">Address</span>
          <input value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block"><span className="block eyebrow mb-2">City</span>
          <input value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block"><span className="block eyebrow mb-2">State</span>
          <input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block"><span className="block eyebrow mb-2">Pincode</span>
          <input value={f.pincode} onChange={(e) => setF({ ...f, pincode: e.target.value })}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <button disabled={saving} className="md:col-span-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 justify-self-start">
          {saving ? "Saving…" : exists ? "Update business" : "Save business"}
        </button>
      </form>
    </div>
  );
}

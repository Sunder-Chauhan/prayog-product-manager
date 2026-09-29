import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [full_name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        setName(data?.full_name ?? "");
        setPhone(data?.phone ?? "");
      });
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name, phone }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  }

  return (
    <div>
      <h2 className="h-display text-2xl">Profile</h2>
      <form onSubmit={save} className="mt-6 max-w-md space-y-4">
        <label className="block">
          <span className="block eyebrow mb-2">Full name</span>
          <input value={full_name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="block eyebrow mb-2">Phone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm" />
        </label>
        <label className="block">
          <span className="block eyebrow mb-2">Email</span>
          <input value={user?.email ?? ""} disabled
            className="w-full bg-muted border border-input rounded-sm px-3 py-3 text-sm text-muted-foreground" />
        </label>
        <button disabled={saving}
          className="rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { buildQuoteMessage, whatsappUrl } from "@/lib/whatsapp";
import interiorImg from "@/assets/interior-inspiration.jpg";

export const Route = createFileRoute("/trade")({
  head: () => ({
    meta: [
      { title: "Trade & bulk orders — Prayog" },
      { name: "description", content: "Trade pricing, bulk orders and custom commissions for hotels, restaurants, interior designers and architects." },
      { property: "og:title", content: "Trade & bulk orders — Prayog" },
      { property: "og:description", content: "Trade pricing and bespoke commissions for hospitality and design partners." },
      { property: "og:image", content: "/images/interior-inspiration.jpg" },
      { property: "og:url", content: "/trade" },
    ],
    links: [{ rel: "canonical", href: "/trade" }],
  }),
  component: TradePage,
});

const TYPES = ["Hotel", "Resort", "Restaurant", "Interior Designer", "Architect", "Retail Store", "Corporate Office", "Distributor", "Builder", "Real Estate", "Event Planner", "Gifting Company", "Other"] as const;

function TradePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    name: "", email: "", phone: "",
    company: "", businessType: "", projectType: "", quantity: "", timeline: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const message = buildQuoteMessage({
      contact: { name: f.name, phone: f.phone, email: f.email },
      company: f.company || undefined,
      businessType: f.businessType || undefined,
      projectType: f.projectType || undefined,
      quantity: f.quantity || undefined,
      timeline: f.timeline || undefined,
      message: f.message,
    });

    if (!user) { setSubmitting(false); toast.error("Please sign in before requesting a quotation."); navigate({ to: "/auth", search: { next: "/trade" } }); return; }
    const { error } = await supabase.from("quotations").insert({
      user_id: user?.id ?? null,
      contact_name: f.name,
      contact_email: f.email,
      contact_phone: f.phone,
      company_name: f.company || null,
      business_type: null, // enum — leave null in form insert
      project_type: f.projectType || null,
      estimated_quantity: f.quantity || null,
      timeline: f.timeline || null,
      message: f.message,
    });
    if (error) { setSubmitting(false); toast.error(error.message); return; }
    else toast.success("Quote request sent — opening WhatsApp for a faster reply.");
    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
    setSubmitting(false);
    if (user) navigate({ to: "/account/orders" });
  }

  return (
    <>
      <section className="relative">
        <div className="relative h-[55vh] min-h-[380px] overflow-hidden">
          <img src={interiorImg} alt="Prayog ceramics styled in a hotel interior" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 to-transparent" />
          <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-14">
            <div className="eyebrow text-foreground/80">Trade & Bulk</div>
            <h1 className="h-display text-5xl md:text-7xl mt-3 max-w-2xl">
              For hotels, designers, architects.
            </h1>
          </div>
        </div>
      </section>

      <section className="container-editorial py-16 md:py-24 grid gap-12 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <div className="eyebrow">The program</div>
          <h2 className="h-display text-3xl md:text-4xl mt-3">Trade pricing. Considered lead times. Bespoke commissions.</h2>
          <p className="mt-5 text-sm text-muted-foreground leading-relaxed">
            Through our network of trusted ceramic producers, Prayog helps
            hospitality and design projects source handcrafted ceramics at scale
            while maintaining consistent quality.
          </p>
          <ul className="mt-6 space-y-4 text-muted-foreground text-sm">
            <li>· Volume pricing across every curated collection</li>
            <li>· Custom sizes, finishes and colour matches via our maker network</li>
            <li>· A single point of contact across multiple workshops</li>
            <li>· Priority allocation for hospitality projects</li>
            <li>· White-glove logistics across India</li>
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Prefer to chat? WhatsApp us at{" "}
            <a href="https://wa.me/919990576324" className="link-underline text-foreground">+91 99905 76324</a>.
          </p>
        </div>

        <form onSubmit={submit} className="border border-border rounded-sm p-6 md:p-8 bg-card space-y-4">
          <div className="eyebrow">Request a quote</div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Full name" v={f.name} on={(v) => setF({ ...f, name: v })} required />
            <Field label="Company" v={f.company} on={(v) => setF({ ...f, company: v })} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Email" type="email" v={f.email} on={(v) => setF({ ...f, email: v })} required />
            <Field label="Phone" v={f.phone} on={(v) => setF({ ...f, phone: v })} required />
          </div>
          <div>
            <label className="block eyebrow mb-2">Business type</label>
            <select
              value={f.businessType}
              onChange={(e) => setF({ ...f, businessType: e.target.value })}
              className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm"
            >
              <option value="">Select…</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Project type" v={f.projectType} on={(v) => setF({ ...f, projectType: v })} />
            <Field label="Est. quantity" v={f.quantity} on={(v) => setF({ ...f, quantity: v })} />
            <Field label="Timeline" v={f.timeline} on={(v) => setF({ ...f, timeline: v })} />
          </div>
          <Field label="Tell us about the project" v={f.message} on={(v) => setF({ ...f, message: v })} multiline required />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary px-6 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      </section>
    </>
  );
}

function Field({ label, v, on, type = "text", required, multiline }: {
  label: string; v: string; on: (v: string) => void; type?: string; required?: boolean; multiline?: boolean;
}) {
  const cls = "w-full bg-background border border-input rounded-sm px-3 py-3 text-sm focus:outline-none focus:border-accent";
  return (
    <label className="block">
      <span className="block eyebrow mb-2">{label}{required && " *"}</span>
      {multiline
        ? <textarea rows={4} required={required} value={v} onChange={(e) => on(e.target.value)} className={cls} />
        : <input type={type} required={required} value={v} onChange={(e) => on(e.target.value)} className={cls} />}
    </label>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { hydrateCart, useCart } from "@/lib/cart-store";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Prayog" }, { name: "robots", content: "noindex" }] }),
  component: CheckoutPage,
});

const BUSINESS_TYPES = [
  ["hotel", "Hotel"], ["resort", "Resort"], ["restaurant", "Restaurant"],
  ["interior_designer", "Interior Designer"], ["architect", "Architect"],
  ["retail_store", "Retail Store"], ["corporate_office", "Corporate Office"],
  ["distributor", "Distributor"], ["builder", "Builder"],
  ["real_estate", "Real Estate"], ["event_planner", "Event Planner"],
  ["gifting_company", "Gifting Company"], ["other", "Other"],
] as const;

function CheckoutPage() {
  useEffect(() => hydrateCart(), []);
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
    notes: "",
    company: "", gst: "", businessType: "",
  });

  // Prefill from profile
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data) setForm((f) => ({
          ...f,
          name: f.name || data.full_name || "",
          phone: f.phone || data.phone || "",
          email: f.email || user.email || "",
        }));
      });
  }, [user]);

  if (items.length === 0) {
    return (
      <div className="container-editorial py-32 text-center">
        <h1 className="h-display text-3xl">Your cart is empty.</h1>
        <Link to="/products" className="mt-6 inline-block link-underline">Browse products</Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    const message = buildOrderMessage({
      customer: {
        name: form.name, email: form.email, phone: form.phone,
        company: form.company || undefined,
        gst: form.gst || undefined,
        businessType: form.businessType || undefined,
      },
      address: {
        line1: form.line1, line2: form.line2 || undefined,
        city: form.city, state: form.state, pincode: form.pincode, country: form.country,
        notes: form.notes || undefined,
      },
      items: items.map((i) => ({ sku: i.sku, name: i.name, quantity: i.quantity })),
    });

    // Persist order (if signed in)
    if (user) {
      const subtotal = items.reduce((n, i) => n + (i.price ?? 0) * i.quantity, 0);
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          status: "whatsapp_sent",
          is_bulk: false,
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          shipping_address: {
            line1: form.line1, line2: form.line2, city: form.city,
            state: form.state, pincode: form.pincode, country: form.country,
            notes: form.notes,
          },
          delivery_notes: form.notes || null,
          items_count: items.reduce((n, i) => n + i.quantity, 0),
          subtotal: subtotal || null,
          whatsapp_sent_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) {
        toast.error("Couldn't save order — continuing to WhatsApp anyway.");
      } else if (order) {
        await supabase.from("order_items").insert(
          items.map((i) => ({
            order_id: order.id,
            product_id: i.productId,
            product_name: i.name,
            sku: i.sku ?? null,
            quantity: i.quantity,
            unit_price: i.price ?? null,
            line_total: (i.price ?? 0) * i.quantity || null,
          })),
        );
      }
    }

    // Open WhatsApp
    window.open(whatsappUrl(message), "_blank", "noopener,noreferrer");
    clear();
    setSubmitting(false);
    navigate({ to: user ? "/account/orders" : "/" });
    toast.success("Order details opened in WhatsApp. Our team will confirm shortly.");
  }

  const subtotal = items.reduce((n, i) => n + (i.price ?? 0) * i.quantity, 0);

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="eyebrow">Checkout</div>
      <h1 className="h-display text-4xl md:text-5xl mt-3">Confirm on WhatsApp</h1>
      <p className="mt-4 max-w-xl text-muted-foreground">
        We finalise every order personally — pricing, GST, delivery timeline. Fill in
        your details and we'll open a pre-filled WhatsApp message to Prayog.
      </p>

      <form onSubmit={handleSubmit} className="mt-12 grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-8">
          <Fieldset title="Contact">
            <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
              <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
            </div>
          </Fieldset>

          <Fieldset title="Shipping">
            <Field label="Address line 1" value={form.line1} onChange={(v) => setForm({ ...form, line1: v })} required />
            <Field label="Address line 2 (optional)" value={form.line2} onChange={(v) => setForm({ ...form, line2: v })} />
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
              <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
              <Field label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} required />
            </div>
            <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
            <Field label="Delivery notes (optional)" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} multiline />
          </Fieldset>

          <Fieldset title="Business (optional)">
            <p className="text-xs text-muted-foreground">
              Add your business details for a trade / bulk quotation.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Company name" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
              <Field label="GST" value={form.gst} onChange={(v) => setForm({ ...form, gst: v })} />
            </div>
            <div>
              <label className="block eyebrow mb-2">Business type</label>
              <select
                className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm"
                value={form.businessType}
                onChange={(e) => setForm({ ...form, businessType: e.target.value })}
              >
                <option value="">Select…</option>
                {BUSINESS_TYPES.map(([v, l]) => <option key={v} value={l}>{l}</option>)}
              </select>
            </div>
          </Fieldset>
        </div>

        <aside className="lg:sticky lg:top-24 self-start border border-border rounded-sm p-6 md:p-8 bg-card">
          <div className="eyebrow">Your selection</div>
          <div className="mt-4 divide-y divide-border">
            {items.map((i) => (
              <div key={i.productId} className="py-3 flex justify-between text-sm">
                <span>{i.quantity} × {i.name}</span>
                {i.price != null && <span>₹{(i.price * i.quantity).toLocaleString("en-IN")}</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-border flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal (indicative)</span>
            <span>₹{subtotal.toLocaleString("en-IN")}</span>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-full bg-primary px-6 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
          >
            {submitting ? "Preparing…" : "Confirm on WhatsApp"}
          </button>
          <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
            No payment now. Our team confirms pricing and delivery on WhatsApp; payment is arranged separately (bank transfer / UPI / cash).
          </p>
        </aside>
      </form>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-border pt-6">
      <div className="eyebrow mb-5">{title}</div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, type = "text", required, multiline,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; multiline?: boolean;
}) {
  const cls = "w-full bg-background border border-input rounded-sm px-3 py-3 text-sm focus:outline-none focus:border-accent transition-colors";
  return (
    <label className="block">
      <span className="block eyebrow mb-2">{label}{required && " *"}</span>
      {multiline ? (
        <textarea rows={3} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </label>
  );
}

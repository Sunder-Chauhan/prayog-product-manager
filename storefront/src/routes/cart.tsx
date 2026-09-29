import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { hydrateCart, useCart } from "@/lib/cart-store";
import { Minus, Plus, X, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — Prayog" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  useEffect(() => hydrateCart(), []);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const subtotal = useCart((s) => s.items.reduce((n, i) => n + (i.price ?? 0) * i.quantity, 0));

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="eyebrow">Cart</div>
      <h1 className="h-display text-4xl md:text-5xl mt-3">Your selection</h1>

      {items.length === 0 ? (
        <div className="mt-16 border border-dashed border-border rounded-sm py-24 text-center">
          <p className="text-muted-foreground">Your cart is quietly empty.</p>
          <Link
            to="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            Browse products <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <div className="mt-10 grid gap-12 lg:grid-cols-[1.5fr_1fr]">
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div key={i.productId} className="py-6 flex gap-5">
                <Link to="/products/$slug" params={{ slug: i.slug }} className="w-24 h-28 md:w-32 md:h-36 shrink-0 bg-secondary overflow-hidden">
                  {i.image && <img src={i.image} alt={i.name} className="h-full w-full object-cover" />}
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link to="/products/$slug" params={{ slug: i.slug }} className="font-serif text-lg link-underline">{i.name}</Link>
                      {i.sku && <div className="text-xs text-muted-foreground mt-0.5">SKU {i.sku}</div>}
                    </div>
                    <button onClick={() => remove(i.productId)} aria-label="Remove" className="p-1 text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-4 pt-4">
                    <div className="inline-flex items-center rounded-full border border-border">
                      <button onClick={() => setQty(i.productId, i.quantity - 1)} className="p-2 hover:bg-secondary rounded-l-full">
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-[2ch] text-center text-sm">{i.quantity}</span>
                      <button onClick={() => setQty(i.productId, i.quantity + 1)} className="p-2 hover:bg-secondary rounded-r-full">
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    {i.price != null && (
                      <div className="text-sm">₹{(i.price * i.quantity).toLocaleString("en-IN")}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:sticky lg:top-24 self-start border border-border rounded-sm p-6 md:p-8 bg-card">
            <div className="eyebrow">Summary</div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal (indicative)</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">Confirmed on WhatsApp</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-border text-xs text-muted-foreground leading-relaxed">
              Prayog orders are hand-finished. Your final quote — including shipping,
              GST and lead time — is confirmed personally over WhatsApp.
            </div>
            <Link
              to="/checkout"
              className="mt-6 block text-center rounded-full bg-primary px-7 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Continue to checkout
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

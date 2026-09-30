import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { formatMeasurement, type LengthUnit } from "@/lib/measurement-units";
import { useCart } from "@/lib/cart-store";
import { toast } from "sonner";
import { ArrowRight, Heart, Minus, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { ZoomableImage } from "@/components/site/ZoomableImage";
import { InteractiveProductViewer } from "@/components/site/InteractiveProductViewer";

const productQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, collections(name, slug)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

export const Route = createFileRoute("/products/$slug")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(productQueryOptions(params.slug)),
  head: ({ params, loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? params.slug.replace(/-/g, " ")} — Prayog` },
      { name: "description", content: loaderData?.tagline ?? "" },
      { property: "og:title", content: `${loaderData?.name ?? params.slug} — Prayog` },
      { property: "og:description", content: loaderData?.tagline ?? "" },
      { property: "og:url", content: `/products/${params.slug}` },
      { property: "og:type", content: "product" },
      ...(loaderData?.hero_image_url ? [{ property: "og:image", content: loaderData.hero_image_url }] : []),
    ],
    links: [{ rel: "canonical", href: `/products/${params.slug}` }],
  }),
  errorComponent: ({ reset }) => {
    const router = useRouter();
    return (
      <div className="container-editorial py-32 text-center">
        <p className="text-muted-foreground">We couldn't load this piece.</p>
        <button
          onClick={() => { reset(); router.invalidate(); }}
          className="mt-4 rounded-full border border-border px-5 py-2 text-xs uppercase tracking-widest"
        >Try again</button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="container-editorial py-32 text-center">
      <h1 className="h-display text-3xl">Piece not found</h1>
      <p className="mt-3 text-muted-foreground">This product may have moved or is no longer available.</p>
      <Link to="/products" className="mt-6 inline-block link-underline text-sm">Browse all products</Link>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const { slug } = Route.useParams();
  const [qty, setQty] = useState(1);
  const [lengthUnit, setLengthUnit] = useState<LengthUnit>("cm");
  const [activeImg, setActiveImg] = useState(0);
  const add = useCart((s) => s.add);
  const { user } = useAuth();

  const { data: product } = useSuspenseQuery(productQueryOptions(slug));

  const { data: related } = useQuery({
    queryKey: ["related", product?.collection_id, product?.id],
    enabled: !!product?.collection_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, hero_image_url, base_price, tagline")
        .eq("collection_id", product!.collection_id!)
        .neq("id", product!.id)
        .eq("is_published", true)
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });


  const gallery: string[] = Array.isArray(product.gallery)
    ? (product.gallery as Array<string | { url?: string }>)
        .map((g) => (typeof g === "string" ? g : g?.url ?? ""))
        .filter(Boolean)
    : [];
  if (gallery.length === 0 && product.hero_image_url) gallery.push(product.hero_image_url);
  const originalSpecs = (product.specifications ?? {}) as Record<string, string>;
  const specs = Object.fromEntries(Object.entries(originalSpecs).map(([key, value]) => [key, formatMeasurement(value, lengthUnit)]));

  const toggleWishlist = async () => {
    if (!user) {
      toast.error("Sign in to save to your wishlist");
      return;
    }
    const { error } = await supabase
      .from("wishlist")
      .insert({ user_id: user.id, product_id: product.id });
    if (error && !error.message.includes("duplicate")) toast.error(error.message);
    else toast.success("Saved to wishlist");
  };

  return (
    <>
      <div className="container-editorial pt-8 pb-4 text-xs text-muted-foreground">
        <Link to="/products" className="link-underline">All products</Link>
        {product.collections && (
          <>
            {" / "}
            <Link to="/collections/$slug" params={{ slug: product.collections.slug }} className="link-underline">
              {product.collections.name}
            </Link>
          </>
        )}
      </div>

      <section className="container-editorial pb-16 grid gap-10 lg:gap-16 lg:grid-cols-[1.2fr_1fr]">
        {/* Gallery */}
        <div>
          {product.cutout_image_url ? (
            <InteractiveProductViewer
              productName={product.name}
              cutoutUrl={product.cutout_image_url}
              gallery={gallery.map((url) => ({ url }))}
              fallbackUrl={gallery[0] ?? product.hero_image_url ?? ""}
              scenes={
                Array.isArray(product.scenes)
                  ? (product.scenes as Array<{ label?: string; url?: string }>)
                      .filter((s) => s?.label && s?.url)
                      .map((s) => ({ label: s.label!, url: s.url! }))
                  : []
              }
              specs={specs}
            />
          ) : (
            <>
              <ZoomableImage
                key={gallery[activeImg]}
                src={gallery[activeImg]}
                alt={product.name}
                className="aspect-[4/5]"
              />
              {gallery.length > 1 && (
                <div className="mt-6 grid grid-cols-5 gap-3">
                  {gallery.map((g, i) => (
                    <button
                      key={g + i}
                      onClick={() => setActiveImg(i)}
                      className={`aspect-square overflow-hidden bg-secondary border ${
                        i === activeImg ? "border-accent" : "border-transparent"
                      }`}
                    >
                      <img src={g} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div className="lg:sticky lg:top-24 self-start">
          <div className="eyebrow">{product.collections?.name ?? "Prayog"}</div>
          <h1 className="h-display text-4xl md:text-5xl mt-3">{product.name}</h1>
          <p className="mt-2 text-lg text-accent">{product.tagline}</p>
          {product.base_price && (
            <div className="mt-6 text-2xl">₹{Number(product.base_price).toLocaleString("en-IN")}</div>
          )}
          <p className="mt-6 text-muted-foreground leading-relaxed">{product.description}</p>

          {/* Qty + CTAs */}
          <div className="mt-8 flex items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-border">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-3 hover:bg-secondary rounded-l-full">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[2ch] text-center text-sm">{qty}</span>
              <button onClick={() => setQty(qty + 1)} className="p-3 hover:bg-secondary rounded-r-full">
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              disabled={!((product as any).stock_on_hand > 0)}
              onClick={() => {
                add(
                  {
                    productId: product.id,
                    slug: product.slug,
                    name: product.name,
                    sku: product.sku,
                    price: product.base_price ? Number(product.base_price) : null,
                    image: product.hero_image_url,
                  },
                  qty,
                );
                toast.success(`Added ${qty} × ${product.name} to cart`);
              }}
              className="flex-1 rounded-full bg-primary px-7 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              {(product as any).stock_on_hand > 0 ? "Add to cart" : "Availability pending"}
            </button>
            <button
              onClick={toggleWishlist}
              className="rounded-full border border-border p-3.5 hover:bg-secondary transition-colors"
              aria-label="Save to wishlist"
            >
              <Heart className="h-4 w-4" />
            </button>
          </div>

          <Link
            to="/trade"
            className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground link-underline"
          >
            Bulk or trade pricing <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {product.story && (
            <div className="mt-12 border-t border-border pt-8">
              <div className="eyebrow">The story</div>
              <p className="mt-3 text-muted-foreground leading-relaxed">{product.story}</p>
            </div>
          )}

          {Object.keys(specs).length > 0 && (
            <div className="mt-10 border-t border-border pt-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="eyebrow">Specifications</div>
                <div role="group" aria-label="Measurement units" className="inline-flex rounded-full border border-border p-1">
                  {(["cm", "in"] as const).map((unit) => (
                    <button key={unit} type="button" aria-pressed={lengthUnit === unit}
                      onClick={() => setLengthUnit(unit)}
                      className={`rounded-full px-4 py-2 text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${lengthUnit === unit ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}>
                      {unit === "cm" ? "cm" : "inches"}
                    </button>
                  ))}
                </div>
              </div>
              <dl aria-live="polite" className="mt-4 divide-y divide-border">
                {Object.entries(specs).map(([k, v]) => (
                  <div key={k} className="py-3 flex justify-between gap-6 text-sm">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </div>
      </section>

      {related && related.length > 0 && (
        <section className="container-editorial py-16 md:py-24 border-t border-border">
          <h2 className="h-display text-3xl md:text-4xl">Also in this collection</h2>
          <div className="mt-8 grid gap-6 md:gap-10 grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="group">
                <div className="aspect-[5/6] overflow-hidden bg-secondary">
                  <img src={p.hero_image_url ?? ""} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]" />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
                  </div>
                  {p.base_price && <div className="text-sm">₹{Number(p.base_price).toLocaleString("en-IN")}</div>}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

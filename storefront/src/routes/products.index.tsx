import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/products/")({
  head: () => ({
    meta: [
      { title: "All products — Prayog" },
      { name: "description", content: "Every current Prayog piece — sculptural vessels, tableware and planters, curated from independent ceramic makers across India." },
      { property: "og:title", content: "All products — Prayog" },
      { property: "og:description", content: "Browse the full Prayog catalogue — sculptural vessels, tableware and planters, curated from independent Indian workshops." },
      { property: "og:url", content: "/products" },
    ],
    links: [{ rel: "canonical", href: "/products" }],
  }),
  component: ProductsIndex,
});

function ProductsIndex() {
  const { data } = useQuery({
    queryKey: ["products", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, tagline, hero_image_url, base_price, collection_id, collections(name, slug)")
        .eq("is_published", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container-editorial py-20 md:py-28">
      <div className="max-w-2xl">
        <div className="eyebrow">Curated catalogue</div>
        <h1 className="h-display text-5xl md:text-6xl mt-4">Every current piece.</h1>
        <p className="mt-5 text-muted-foreground text-lg">
          A single view of everything currently curated — crafted by independent
          ceramic makers across India.
        </p>
      </div>
      <div className="mt-14 grid gap-6 md:gap-10 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(data ?? []).map((p) => (
          <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="group block">
            <div className="aspect-[5/6] overflow-hidden bg-secondary">
              <img src={p.hero_image_url ?? ""} alt={p.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]" />
            </div>
            <div className="mt-4">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {p.collections?.name}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-3">
                <h3 className="font-serif text-lg">{p.name}</h3>
                {p.base_price && <div className="text-sm">₹{Number(p.base_price).toLocaleString("en-IN")}</div>}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

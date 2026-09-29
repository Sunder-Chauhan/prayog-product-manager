import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/collections/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.charAt(0).toUpperCase() + params.slug.slice(1)} — Prayog` },
      { property: "og:url", content: `/collections/${params.slug}` },
    ],
    links: [{ rel: "canonical", href: `/collections/${params.slug}` }],
  }),
  component: CollectionDetail,
  notFoundComponent: () => (
    <div className="container-editorial py-32 text-center">
      <h1 className="h-display text-4xl">Collection not found</h1>
      <Link to="/collections" className="mt-6 inline-block link-underline">View all collections</Link>
    </div>
  ),
});

function CollectionDetail() {
  const { slug } = Route.useParams();

  const { data: collection, isLoading } = useQuery({
    queryKey: ["collection", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, name, tagline, description, cover_image_url")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["collection-products", collection?.id],
    enabled: !!collection?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, tagline, hero_image_url, base_price")
        .eq("collection_id", collection!.id)
        .eq("is_published", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading || !collection) {
    return <div className="container-editorial py-32 text-muted-foreground">Loading…</div>;
  }

  return (
    <>
      <section className="relative">
        <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
          <img src={collection.cover_image_url ?? ""} alt={collection.name} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-14">
            <div className="eyebrow text-foreground/80">Curated collection</div>
            <h1 className="h-display text-5xl md:text-7xl mt-3">{collection.name}</h1>
            <p className="mt-3 text-lg md:text-xl text-foreground/85 max-w-xl">{collection.tagline}</p>
          </div>
        </div>
      </section>

      <section className="container-editorial py-16 md:py-24">
        <p className="max-w-2xl text-muted-foreground text-lg leading-relaxed">
          {collection.description}
        </p>
      </section>

      <section className="container-editorial pb-24">
        <div className="grid gap-6 md:gap-10 grid-cols-2 lg:grid-cols-3">
          {(products ?? []).map((p) => (
            <Link key={p.id} to="/products/$slug" params={{ slug: p.slug }} className="group block">
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
          {products && products.length === 0 && (
            <div className="col-span-full py-16 text-center text-muted-foreground">
              New pieces arriving soon.
            </div>
          )}
        </div>
      </section>
    </>
  );
}

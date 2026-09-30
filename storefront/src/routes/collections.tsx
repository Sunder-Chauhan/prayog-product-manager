import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/collections")({
  head: () => ({
    meta: [
      { title: "Curated collections — Prayog" },
      { name: "description", content: "Explore Prayog's curated ceramic collections: sculptural vessels, everyday tableware and architectural planters sourced from independent Indian makers." },
      { property: "og:title", content: "Curated collections — Prayog" },
      { property: "og:description", content: "Sculptural vessels, tableware and planters — three curated families of objects from India's finest independent workshops." },
      { property: "og:url", content: "/collections" },
    ],
    links: [{ rel: "canonical", href: "/collections" }],
  }),
  component: CollectionsIndex,
});

function CollectionsIndex() {
  const { data } = useQuery({
    queryKey: ["collections", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, name, tagline, description, cover_image_url")
        .eq("is_published", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="container-editorial py-20 md:py-28">
      <div className="max-w-2xl">
        <div className="eyebrow">Curated collections</div>
        <h1 className="h-display text-5xl md:text-6xl mt-4">Explore our collections.</h1>
        <p className="mt-5 text-muted-foreground text-lg">
          Each collection is selected from independent workshops across India —
          chosen for how a piece will be used, held, or looked at every day.
        </p>
      </div>
      <div className="mt-16 grid gap-16 md:gap-24">
        {(data ?? []).map((c, i) => (
          <Link
            key={c.id}
            to="/collections/$slug"
            params={{ slug: c.slug }}
            className={`group grid gap-8 md:gap-12 md:grid-cols-2 items-center ${i % 2 === 1 ? "md:[&>*:first-child]:order-2" : ""}`}
          >
            <div className="aspect-[4/5] overflow-hidden bg-secondary">
              <img
                src={c.cover_image_url ?? ""}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
            </div>
            <div>
              <div className="eyebrow">Collection · 0{i + 1}</div>
              <h2 className="h-display text-4xl md:text-5xl mt-3">{c.name}</h2>
              <p className="mt-2 text-lg text-accent">{c.tagline}</p>
              <p className="mt-5 text-muted-foreground leading-relaxed max-w-md">
                {c.description}
              </p>
              <span className="mt-6 inline-block link-underline text-sm">View collection →</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

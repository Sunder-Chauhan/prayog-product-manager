import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import heroAsset from "@/assets/prayog-collection-group.jpg.asset.json";
import craftImg from "@/assets/craftsmanship.jpg";
import interiorImg from "@/assets/interior-inspiration.jpg";
const heroImg = heroAsset.url;

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const { data: collections } = useQuery({
    queryKey: ["collections", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("id, slug, name, tagline, cover_image_url")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: featured } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, slug, name, tagline, hero_image_url, base_price")
        .eq("is_published", true)
        .eq("is_featured", true)
        .order("sort_order")
        .limit(4);
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <>
      {/* HERO */}
      <section className="relative">
        <div className="relative h-[92vh] min-h-[620px] w-full overflow-hidden">
          <img
            src={heroImg}
            alt="Handcrafted Prayog ceramic vessels arranged on a warm limewashed plinth"
            width={1920}
            height={1200}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/70" />
          <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-16 md:pb-24">
            <div className="max-w-2xl">
              <div className="eyebrow text-foreground/70">Prayog · A curated ceramic house</div>
              <h1 className="h-display text-5xl md:text-7xl lg:text-8xl mt-5 leading-[0.98]">
                Curated ceramics<br />from India's<br />finest makers.
              </h1>
              <p className="mt-6 max-w-md text-base md:text-lg text-foreground/80 leading-relaxed">
                Thoughtfully sourced sculptural vessels, tableware and planters —
                selected from independent workshops for interiors that reward attention.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/collections"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Explore collections <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  to="/trade"
                  className="inline-flex items-center rounded-full border border-foreground/25 px-7 py-3.5 text-xs uppercase tracking-widest hover:bg-foreground/5 transition-colors"
                >
                  For trade & hospitality
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED COLLECTIONS */}
      <section className="container-editorial py-24 md:py-32">
        <div className="flex items-end justify-between gap-8 mb-14">
          <div>
            <div className="eyebrow">Curated collections</div>
            <h2 className="h-display text-4xl md:text-5xl mt-3 max-w-xl">
              Three families of objects, one considered eye.
            </h2>
          </div>
          <Link to="/collections" className="hidden md:inline-flex link-underline text-sm items-center gap-2">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:gap-8 md:grid-cols-3">
          {(collections ?? []).map((c) => (
            <Link
              key={c.id}
              to="/collections/$slug"
              params={{ slug: c.slug }}
              className="group block"
            >
              <div className="aspect-[4/5] overflow-hidden bg-secondary">
                <img
                  src={c.cover_image_url ?? ""}
                  alt={c.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
                />
              </div>
              <div className="mt-5">
                <h3 className="h-display text-2xl">{c.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{c.tagline}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="bg-secondary/40 py-24 md:py-32">
        <div className="container-editorial">
          <div className="flex items-end justify-between mb-14">
            <div>
              <div className="eyebrow">Signature</div>
              <h2 className="h-display text-4xl md:text-5xl mt-3">New this season</h2>
            </div>
            <Link to="/products" className="hidden md:inline-flex link-underline text-sm items-center gap-2">
              All products <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid gap-6 md:gap-10 grid-cols-2 lg:grid-cols-4">
            {(featured ?? []).map((p) => (
              <Link
                key={p.id}
                to="/products/$slug"
                params={{ slug: p.slug }}
                className="group block"
              >
                <div className="aspect-[5/6] overflow-hidden bg-background">
                  <img
                    src={p.hero_image_url ?? ""}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.03]"
                  />
                </div>
                <div className="mt-4 flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="font-serif text-lg leading-tight">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.tagline}</p>
                  </div>
                  {p.base_price ? (
                    <div className="text-sm">₹{Number(p.base_price).toLocaleString("en-IN")}</div>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CRAFTSMANSHIP */}
      <section className="container-editorial py-24 md:py-32">
        <div className="grid gap-12 md:gap-16 md:grid-cols-2 items-center">
          <div className="aspect-[4/5] overflow-hidden">
            <img src={craftImg} alt="A potter's hands shaping wet clay on a wheel" loading="lazy" className="h-full w-full object-cover" />
          </div>
          <div>
            <div className="eyebrow">Craftsmanship</div>
            <h2 className="h-display text-4xl md:text-5xl mt-4 leading-[1.04]">
              Chosen from workshops<br />where craft has been<br />refined for generations.
            </h2>
            <p className="mt-6 text-base text-muted-foreground leading-relaxed max-w-lg">
              Every piece in the Prayog collection is selected from independent
              ceramic studios across India that share our standards for
              craftsmanship, durability and enduring design.
            </p>
            <Link
              to="/craftsmanship"
              className="mt-8 inline-flex items-center gap-2 link-underline text-sm"
            >
              How we curate <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* INTERIOR INSPIRATION */}
      <section className="relative">
        <div className="relative h-[70vh] min-h-[420px] w-full overflow-hidden">
          <img src={interiorImg} alt="Prayog ceramics styled in a luxury hotel lobby" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/30 to-transparent" />
          <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-16">
            <div className="max-w-xl">
              <div className="eyebrow text-foreground/80">In situ</div>
              <h2 className="h-display text-4xl md:text-5xl mt-3">
                Trusted by hotels, designers and considered homes.
              </h2>
              <Link to="/trade" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                Trade program <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-editorial py-24 md:py-32 text-center">
        <div className="eyebrow">Bespoke</div>
        <h2 className="h-display text-4xl md:text-6xl mt-4 max-w-3xl mx-auto leading-[1.05]">
          A project in mind? We'd like to hear about it.
        </h2>
        <p className="mt-5 text-muted-foreground max-w-lg mx-auto">
          Hospitality installations, custom orders, brand collaborations —
          through our network of trusted producers we source ceramics at scale
          without losing the mark of the maker's hand.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/trade" className="rounded-full bg-primary px-7 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            Request a quote
          </Link>
          <Link to="/contact" className="rounded-full border border-border px-7 py-3.5 text-xs uppercase tracking-widest hover:bg-secondary transition-colors">
            Contact the studio
          </Link>
        </div>
      </section>
    </>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/story")({
  head: () => ({
    meta: [
      { title: "Our story — Prayog" },
      { name: "description", content: "Prayog is a curated house of handcrafted ceramics — sourcing exceptional pieces from India's finest independent makers." },
      { property: "og:title", content: "Our story — Prayog" },
      { property: "og:description", content: "A curated ceramic house connecting India's finest independent makers with homes, designers and hospitality." },
      { property: "og:url", content: "/story" },
    ],
    links: [{ rel: "canonical", href: "/story" }],
  }),
  component: Story,
});

function Story() {
  return (
    <div className="container-editorial py-20 md:py-32 max-w-3xl">
      <div className="eyebrow">Our story</div>
      <h1 className="h-display text-5xl md:text-6xl mt-4 leading-[1.02]">
        A curated house for the slow object.
      </h1>
      <div className="mt-10 space-y-6 text-lg text-muted-foreground leading-relaxed">
        <p>
          Prayog — from the Sanskrit for <em>experiment</em> — began with a simple
          belief: exceptional objects deserve to be discovered beyond the workshop
          where they are made.
        </p>
        <p>
          Today we partner with independent ceramic studios and artisans across
          India, carefully selecting pieces that combine craftsmanship,
          functionality and enduring design. Every collection is curated by Prayog
          before it reaches our customers.
        </p>
        <p>
          Our objects are chosen by hotels, restaurants and interior designers who
          want the mark of the maker's hand to be visible — and by homes that
          treat a bowl, a vase, a planter as a companion rather than a purchase.
        </p>
      </div>
      <div className="mt-12">
        <Link to="/craftsmanship" className="link-underline">How we choose every piece →</Link>
      </div>
    </div>
  );
}

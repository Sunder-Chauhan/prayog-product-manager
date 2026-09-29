import { createFileRoute, Link } from "@tanstack/react-router";
import craftImg from "@/assets/craftsmanship.jpg";

export const Route = createFileRoute("/craftsmanship")({
  head: () => ({
    meta: [
      { title: "How we curate — Prayog" },
      { name: "description", content: "How Prayog discovers, evaluates and curates handcrafted ceramics from independent studios across India." },
      { property: "og:title", content: "How we curate — Prayog" },
      { property: "og:description", content: "Our sourcing process — from discovering independent studios to inspecting every piece before it reaches you." },
      { property: "og:image", content: "/images/craftsmanship.jpg" },
      { property: "og:url", content: "/craftsmanship" },
    ],
    links: [{ rel: "canonical", href: "/craftsmanship" }],
  }),
  component: Craftsmanship,
});

const STEPS = [
  { n: "01", t: "Discover independent studios", d: "We travel through India's ceramic regions — Khurja, Jaipur, Pondicherry, Auroville — meeting independent makers whose work stands out for its integrity." },
  { n: "02", t: "Evaluate craftsmanship", d: "We look for the hand of a single maker: throwing consistency, trimmed feet, glaze control, the small marks that separate a considered object from a mass-produced one." },
  { n: "03", t: "Assess materials & firing", d: "Clay body, glaze chemistry, firing temperature — every piece we select must be food-safe, water-safe and built for a long life." },
  { n: "04", t: "Curate the collection", d: "From a workshop's full range we choose only the pieces that fit Prayog's material language — quiet forms, honest surfaces, a coherent family." },
  { n: "05", t: "Quality inspection", d: "Every piece is inspected by our team before it enters inventory. Subtle variation piece to piece is not a defect — it is the signature of a hand — but flaws are not shipped." },
  { n: "06", t: "Carefully packed & delivered", d: "Hand-wrapped and shipped from our fulfilment studio, so the piece arrives exactly as it left the maker's bench." },
];

function Craftsmanship() {
  return (
    <>
      <section className="relative">
        <div className="relative h-[65vh] min-h-[420px] overflow-hidden">
          <img src={craftImg} alt="A potter's hands shaping wet clay on a wheel" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 to-transparent" />
          <div className="relative z-10 container-editorial h-full flex flex-col justify-end pb-14">
            <div className="eyebrow text-foreground/80">How we curate</div>
            <h1 className="h-display text-5xl md:text-7xl mt-3 max-w-2xl leading-[1.02]">
              A considered eye, applied to every workshop we visit.
            </h1>
          </div>
        </div>
      </section>

      <section className="container-editorial py-20 md:py-28 max-w-3xl">
        <p className="text-xl md:text-2xl h-display leading-[1.35]">
          Prayog does not run the kiln. We partner with independent ceramic studios
          across India — and every piece we sell passes through six stages of
          curation before it reaches you.
        </p>
      </section>

      <section className="container-editorial pb-24">
        <div className="grid gap-x-12 gap-y-16 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="eyebrow">Step {s.n}</div>
              <h3 className="h-display text-3xl mt-2">{s.t}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-editorial pb-24 md:pb-32 text-center">
        <h2 className="h-display text-4xl md:text-5xl max-w-2xl mx-auto">See what we've curated.</h2>
        <Link to="/collections" className="mt-8 inline-block rounded-full bg-primary px-8 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
          View collections
        </Link>
      </section>
    </>
  );
}

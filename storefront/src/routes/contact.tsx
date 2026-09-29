import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Prayog" },
      { name: "description", content: "Reach the Prayog studio for orders, trade enquiries or press." },
      { property: "og:title", content: "Contact — Prayog" },
      { property: "og:description", content: "Reach the Prayog studio directly." },
      { property: "og:url", content: "/contact" },
    ],
    links: [{ rel: "canonical", href: "/contact" }],
  }),
  component: Contact,
});

function Contact() {
  return (
    <div className="container-editorial py-20 md:py-32 max-w-3xl">
      <div className="eyebrow">Contact</div>
      <h1 className="h-display text-5xl md:text-6xl mt-4">Speak with the studio.</h1>
      <p className="mt-5 text-muted-foreground text-lg">
        We reply personally to every message. WhatsApp is fastest.
      </p>

      <div className="mt-14 grid gap-10 md:grid-cols-2">
        <div>
          <div className="eyebrow">WhatsApp</div>
          <a href="https://wa.me/919990576324" className="mt-2 block h-display text-2xl link-underline">
            +91 99905 76324
          </a>
          <p className="mt-2 text-sm text-muted-foreground">For orders, trade and quick questions.</p>
        </div>
        <div>
          <div className="eyebrow">Email</div>
          <a href="mailto:hello@prayog.co" className="mt-2 block h-display text-2xl link-underline">
            hello@prayog.co
          </a>
          <p className="mt-2 text-sm text-muted-foreground">For press, collaborations and larger projects.</p>
        </div>
        <div>
          <div className="eyebrow">Studio</div>
          <p className="mt-2 h-display text-2xl">Jaipur · Khurja</p>
          <p className="mt-2 text-sm text-muted-foreground">Visits by appointment.</p>
        </div>
        <div>
          <div className="eyebrow">Hours</div>
          <p className="mt-2 h-display text-2xl">Mon — Sat</p>
          <p className="mt-2 text-sm text-muted-foreground">10:00 — 18:00 IST</p>
        </div>
      </div>
    </div>
  );
}

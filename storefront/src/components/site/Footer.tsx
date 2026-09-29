import { Link } from "@tanstack/react-router";
import logoAsset from "@/assets/prayog-logo.png.asset.json";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-border bg-secondary/40">
      <div className="container-editorial py-16 md:py-20 grid gap-12 md:grid-cols-4">
        <div className="md:col-span-2 max-w-md">
          <div className="flex items-center gap-3">
            <img src={logoAsset.url} alt="" className="h-10 w-auto" />
            <div className="h-display text-3xl">Prayog</div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            A curated house of handcrafted ceramics — thoughtfully sourced from
            India's finest independent makers for hotels, designers and considered homes.
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            +91 99905 76324 · hello@prayog.co · GSTIN 07CACKP2901A1ZH
          </p>
        </div>

        <div>
          <div className="eyebrow mb-4">Explore</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/collections" className="link-underline">Collections</Link></li>
            <li><Link to="/products" className="link-underline">All Products</Link></li>
            <li><Link to="/craftsmanship" className="link-underline">Craftsmanship</Link></li>
            <li><Link to="/story" className="link-underline">Our Story</Link></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow mb-4">For Trade</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/trade" className="link-underline">Trade Program</Link></li>
            <li><Link to="/trade" className="link-underline">Bulk Orders</Link></li>
            <li><Link to="/contact" className="link-underline">Contact Sales</Link></li>
            <li><Link to="/auth" className="link-underline">Client Login</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-editorial py-6 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Prayog. Curated from independent ceramic makers across India.</span>
          <span>Made for the slow object.</span>
        </div>
      </div>
    </footer>
  );
}

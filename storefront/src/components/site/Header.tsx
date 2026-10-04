import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useCart, hydrateCart } from "@/lib/cart-store";
import { useAuth } from "@/lib/auth-context";
import { ShoppingBag, Menu, X, User } from "lucide-react";
import logoAsset from "@/assets/prayog-logo.png.asset.json";

const NAV = [
  { to: "/collections", label: "Collections" },
  { to: "/products", label: "Products" },
  { to: "/guide", label: "Guides" },
  { to: "/craftsmanship", label: "Craftsmanship" },
  { to: "/story", label: "Our Story" },
  { to: "/trade", label: "Trade" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const count = useCart((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    hydrateCart();
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur transition-all duration-500 ${
        scrolled ? "bg-background/85 border-b border-border" : "bg-background/40"
      }`}
    >
      <div className="container-editorial flex items-center justify-between py-4 md:py-5">
        <Link to="/" className="flex items-center gap-2.5" aria-label="Prayog — home">
          <img src={logoAsset.url} alt="" className="h-8 md:h-9 w-auto" />
          <span className="h-display text-2xl md:text-[1.6rem] tracking-tight">Prayog</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-6 text-[0.82rem]">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="link-underline text-foreground/80 hover:text-foreground transition-colors"
              activeProps={{ className: "text-foreground" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-2">
          {user ? (
            <Link
              to="/account"
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              <User className="h-4 w-4" />
              <span className="hidden md:inline">Account</span>
            </Link>
          ) : (
            <Link
              to="/auth"
              className="hidden md:inline-flex items-center rounded-full px-3 py-2 text-xs uppercase tracking-widest hover:bg-secondary transition-colors"
            >
              Sign in
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/ops"
              className="hidden md:inline-flex items-center rounded-full px-3 py-2 text-xs uppercase tracking-widest text-accent hover:bg-secondary"
            >
              Ops
            </Link>
          )}
          <Link
            to="/cart"
            aria-label="Cart"
            className="relative inline-flex items-center rounded-full p-2 hover:bg-secondary transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-accent text-accent-foreground text-[10px] font-medium flex items-center justify-center px-1">
                {count}
              </span>
            )}
          </Link>
          <button
            className="lg:hidden inline-flex items-center rounded-full p-2 hover:bg-secondary"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-border bg-background">
          <nav className="container-editorial py-6 flex flex-col gap-4">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-lg py-1"
              >
                {n.label}
              </Link>
            ))}
            {!user && (
              <Link to="/auth" onClick={() => setOpen(false)} className="text-lg py-1">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

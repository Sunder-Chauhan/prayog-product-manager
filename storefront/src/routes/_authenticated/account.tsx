import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({ meta: [{ title: "Your account — Prayog" }, { name: "robots", content: "noindex" }] }),
  component: AccountLayout,
});

const NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/account", label: "Profile", exact: true },
  { to: "/account/orders", label: "Orders" },
  { to: "/account/wishlist", label: "Wishlist" },
  { to: "/account/addresses", label: "Addresses" },
  { to: "/account/business", label: "Business" },
];

function AccountLayout() {
  const { user, signOut, isAdmin } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="container-editorial py-16 md:py-24">
      <div className="eyebrow">Account</div>
      <h1 className="h-display text-4xl md:text-5xl mt-3">Hello, {user?.email?.split("@")[0]}</h1>

      <div className="mt-12 grid gap-10 lg:grid-cols-[220px_1fr]">
        <aside>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible border-b lg:border-b-0 lg:border-r border-border lg:pr-6 pb-2 lg:pb-0">
            {NAV.map((n) => {
              const active = n.exact ? path === n.to : path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as "/account"}
                  className={`text-sm py-2 px-1 whitespace-nowrap ${active ? "text-foreground border-b-2 lg:border-b-0 lg:border-l-2 border-accent lg:pl-3" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {n.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/ops" className="text-sm py-2 px-1 mt-2 text-accent hover:text-accent">
                Operations →
              </Link>
            )}
            <button
              onClick={signOut}
              className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-1"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </nav>
        </aside>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

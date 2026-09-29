import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/ops")({
  head: () => ({ meta: [{ title: "Operations — Prayog" }, { name: "robots", content: "noindex" }] }),
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) throw redirect({ to: "/account" });
  },
  component: OpsLayout,
});

const OPS_NAV: { to: string; label: string; exact?: boolean }[] = [
  { to: "/ops", label: "Cockpit", exact: true },
  { to: "/ops/products", label: "Products" },
  { to: "/ops/inventory", label: "Inventory" },
  { to: "/ops/orders", label: "Orders" },
  { to: "/ops/accounts", label: "Accounts" },
  { to: "/ops/quotations", label: "Quotations" },
  { to: "/ops/customers", label: "Customers" },
  { to: "/ops/live", label: "Live" },
];

function OpsLayout() {
  const { signOut } = useAuth();
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-[70vh]">
      <div className="container-editorial pt-10 pb-6 flex items-center justify-between border-b border-border">
        <div>
          <div className="eyebrow">Prayog · Operations</div>
          <h1 className="h-display text-3xl mt-1">Studio cockpit</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <Link to="/" className="link-underline">View site →</Link>
          <button onClick={signOut} className="link-underline">Sign out</button>
        </div>
      </div>
      <div className="container-editorial grid gap-10 lg:grid-cols-[200px_1fr] py-10">
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          {OPS_NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to as "/ops"}
                className={`text-sm py-2 px-3 rounded-sm whitespace-nowrap ${active ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

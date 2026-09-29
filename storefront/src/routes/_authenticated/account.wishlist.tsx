import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase, getCatalog } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_authenticated/account/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("id, product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      const catalog = await getCatalog();
      return (data ?? []).map((w: any) => ({ ...w, products: catalog.products.find((p: any) => p.id === w.product_id) })).filter((w: any) => w.products);
    },
  });

  return (
    <div>
      <h2 className="h-display text-2xl">Wishlist</h2>
      {data && data.length > 0 ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((w) => w.products && (
            <Link key={w.id} to="/products/$slug" params={{ slug: w.products.slug }} className="group">
              <div className="aspect-[5/6] overflow-hidden bg-secondary">
                <img src={w.products.hero_image_url ?? ""} alt={w.products.name} className="h-full w-full object-cover" />
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="font-serif text-lg">{w.products.name}</h3>
                {w.products.base_price && <span className="text-sm">₹{Number(w.products.base_price).toLocaleString("en-IN")}</span>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">Nothing saved yet. Tap the heart on any product.</p>
      )}
    </div>
  );
}

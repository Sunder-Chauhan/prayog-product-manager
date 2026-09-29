import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const BASE_URL = "";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/collections", changefreq: "weekly", priority: "0.9" },
          { path: "/products", changefreq: "weekly", priority: "0.9" },
          { path: "/craftsmanship", changefreq: "monthly", priority: "0.7" },
          { path: "/story", changefreq: "monthly", priority: "0.7" },
          { path: "/trade", changefreq: "monthly", priority: "0.8" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
        ];

        const [{ data: collections }, { data: products }] = await Promise.all([
          supabase.from("collections").select("slug, updated_at").eq("is_published", true),
          supabase.from("products").select("slug, updated_at").eq("is_published", true),
        ]);
        (collections ?? []).forEach((c) => entries.push({ path: `/collections/${c.slug}`, lastmod: c.updated_at, changefreq: "weekly", priority: "0.8" }));
        (products ?? []).forEach((p) => entries.push({ path: `/products/${p.slug}`, lastmod: p.updated_at, changefreq: "weekly", priority: "0.7" }));

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});

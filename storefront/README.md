# Prayog storefront migration

Existing Lovable storefront ported to standard TanStack Start + Supabase + Vercel. The existing Manager remains at the repository root.

## Status

Source port builds and passes TypeScript. Shared catalog and customer-order RPCs use the Manager database. Manager products remain the inventory authority. Publishing copies approved marketing fields into a public snapshot; checkout validates price and decrements the same stock atomically. Unknown stock, cost, or incomplete products cannot be sold. Never apply legacy-schema/migrations to the Manager database: its products/orders schemas conflict.

Live marketing catalog is preserved in migration-data/catalog.json. Private inventory/costs/customer data are excluded from Git. Images are preserved under public/migrated-assets, with source URL mapping in asset-map.json.

## Pending product mapping

Exact PRY matches: PRY-001, PRY-003, PRY-008, PRY-009. Normalize duplicate prefix: PRY-PRY-002 -> PRY-002, PRY-PRY-006 -> PRY-006. Unresolved: Aurora Tall Vase (PRY-VES-001), Halo Serving Bowl (PRY-TAB-001), Terra Floor Planter (PRY-PLA-001), Ember Teapot (PRY-TAB-002). Do not create duplicate Manager products or guess stock/costs.

## Build

Use Node 24, npm ci, npm run typecheck, npm run build. Environment names are in .env.example. Public publishable key only; no service-role key in browser code. Standard Supabase Google OAuth requires provider configuration in the owned Supabase project.

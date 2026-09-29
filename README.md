# Prayog Decor Business Manager

Private inventory, orders, purchasing and profit dashboard for Ceramic, Lighting and Photo Frames. Built with React, Vite and Supabase.

## Setup

1. Create a dedicated Supabase project for this application. Do not reuse the Prayog storefront or another app's database.
2. Run the SQL migrations in filename order after creating the business account: `20260928_initial.sql`, `20260929_packaging_specs.sql`, then `20260929_move_packaging_into_products.sql`. The last migration moves all 34 workbook rows into `products` and removes the temporary packaging table. Enable email/password sign-in in Supabase Auth. For a private workspace, disable public signups after creating your account.
3. Copy `.env.example` to `.env`. Fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project settings. Never put a service-role or secret key in the frontend.
4. Run `npm ci` and `npm run dev`. Open the displayed local address and create your account.
5. For deployment, set the same two Vite environment variables in your hosting platform and run `npm run build`; publish `dist/`. Set your hosted URL in Supabase Auth URL configuration.

## How it works

- Products store SKU, category, photos, multiple channel prices, physical and packed dimensions and weights, stock threshold and supplier. Image files live in a per-user path in the `product-images` bucket.
- PRY-001–034 are draft products imported from the packaging workbook. Their measurements and original packing notes are retained in `products.packaging_spec`. Product names, prices and opening stock must be entered before use in sales; no missing values were guessed.
- Creating an order reserves stock within a database transaction. A cancelled order restores it. Returns do not automatically put goods back into sellable stock; inspect them and use a stock adjustment if appropriate.
- Receiving a purchase increases stock and updates unit cost to the effective landed cost for that purchase (`unit cost + extra cost / quantity`). Order records retain a cost snapshot for profit history.
- Profit is an operational estimate: sale total less item cost, packaging, shipping, marketplace fees, discounts and recorded overhead. It does not calculate GST, refunds, cash flow, or tax liability. Single product line per order in this version; for a bundle, create one SKU for the bundle.
- Each account sees only its own records through Row Level Security. Product images are private and served through short-lived signed URLs.

## Mobile app (Expo Go)

The native app is in `mobile/`. It uses the same Supabase tables and account as the web app. Copy `mobile/.env.example` to `mobile/.env`, add the same project URL and publishable key, then run `cd mobile && npm ci && npx expo start --tunnel`. Scan the QR code in Expo Go. This development session needs the computer running. Publishing a standalone app requires an Expo account and EAS build.

### Installable Android build for internal testing

From `mobile/`, sign in to an Expo account with `npx eas-cli@latest login`, then link a new Expo project with `npx eas-cli@latest init`. In that Expo project's environment settings, set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the **preview** environment to the same public Supabase URL and publishable key used by the website. Run `npx eas-cli@latest build --platform android --profile preview`, accept managed Android signing when prompted, and open the resulting APK link on an Android phone to install. This build runs without Expo Go or a development computer. For a Play Store release, set the two variables in the **production** environment, run `npx eas-cli@latest build --platform android --profile production`, and submit the resulting AAB through Google Play Console (or EAS Submit). iOS distribution requires an Apple Developer account and TestFlight or registered devices for an internal build.

Before giving separate employees or managers accounts, implement team membership and role policies in Supabase. Current row policies restrict every account to its own records, so a newly registered employee will see an empty workspace. Do not share the owner password. The 34 imported products are draft records; complete their names, prices and opening stock before taking orders.

### Build Android automatically from GitHub

The Expo project can use `mobile/.eas/workflows/build-android.yml` to make a new internal APK whenever `main` is pushed. In Expo project GitHub settings, connect this repository and set **Base directory** to `mobile`. Store `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the Expo **preview** environment. New builds appear under Expo Builds; install the new APK on staff devices for native changes such as the app icon. A Git push creates a build but does not automatically replace an APK already installed on a phone. JavaScript-only over-the-air updates require a separate EAS Update setup and a compatible app build.

## Vercel

Import this project as a Vite app, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for production, build with `npm run build`, and use `dist` as the output directory. Do not expose a Supabase secret key in Vite variables.

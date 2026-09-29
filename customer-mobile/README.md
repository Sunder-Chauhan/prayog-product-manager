# Prayog customer app

Expo customer app that displays the owned responsive storefront. Catalog, cart, checkout, account and trade enquiries use the same website and Supabase data. Native shell includes safe areas, Android back navigation, external-link handling, loading and connection recovery. Website content changes load immediately; changes to native modules require a new build.

Linked Expo project: @sunderexpoapps-team/prayog-decor (32fd23d5-c23a-483f-9dcc-62fa8a3b8830). EAS Update checks compatible releases at launch. Do not reuse the Manager EAS project ID. Preview produces APK; production produces Google Play AAB. Customer app has a distinct Android package and iOS bundle ID.

Run npm ci, npm run typecheck, npx expo export --platform android. Storefront defaults to https://prayog-storefront.vercel.app; override EXPO_PUBLIC_STOREFRONT_URL before build if a custom domain is configured.

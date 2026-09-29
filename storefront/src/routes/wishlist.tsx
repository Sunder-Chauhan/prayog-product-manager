import { createFileRoute, redirect } from "@tanstack/react-router";
// /wishlist is available via /account/wishlist; redirect for convenience.
export const Route = createFileRoute("/wishlist")({
  beforeLoad: () => { throw redirect({ to: "/account/wishlist" }); },
  component: () => null,
});

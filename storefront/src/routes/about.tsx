import { createFileRoute } from "@tanstack/react-router";
import { Redirect } from "@tanstack/react-router";

// About maps to Story
export const Route = createFileRoute("/about")({
  beforeLoad: () => { throw new Response(null, { status: 307, headers: { Location: "/story" } }); },
  component: () => null,
});

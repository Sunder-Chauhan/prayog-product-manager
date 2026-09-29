import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => {
    const next = typeof s.next === "string" && s.next.startsWith("/") && !s.next.startsWith("//") ? s.next : undefined;
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — Prayog" },
      { name: "description", content: "Sign in to your Prayog account to view orders, save products and access trade pricing." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      if (next) {
        window.location.href = next;
      } else {
        navigate({ to: "/account" });
      }
    }
  }, [session, navigate, next]);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: next ? `${window.location.origin}${next}` : `${window.location.origin}/account`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (next) window.location.href = next;
        else navigate({ to: "/account" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth?next=${encodeURIComponent(next || "/account")}` } });
    if (result.error) toast.error(result.error.message);
    // If tokens are returned inline, session is set — the useEffect above will navigate.
    setLoading(false);
  }


  return (
    <div className="container-editorial py-16 md:py-24 max-w-md">
      <div className="eyebrow">{mode === "signin" ? "Sign in" : "Create account"}</div>
      <h1 className="h-display text-4xl md:text-5xl mt-3">
        {mode === "signin" ? "Welcome back." : "Join Prayog."}
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {mode === "signin"
          ? "Access your orders, saved products and trade pricing."
          : "One account for orders, wishlists and trade requests."}
      </p>

      {import.meta.env.VITE_GOOGLE_AUTH_ENABLED === "true" && <button
        onClick={handleGoogle}
        disabled={loading}
        className="mt-8 w-full rounded-full border border-border px-6 py-3.5 text-sm hover:bg-secondary transition-colors disabled:opacity-50"
      >
        Continue with Google
      </button>}

      <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
        <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleEmail} className="space-y-4">
        {mode === "signup" && (
          <Field label="Full name" value={name} onChange={setName} required />
        )}
        <Field label="Email" type="email" value={email} onChange={setEmail} required />
        <Field label="Password" type="password" value={password} onChange={setPassword} required />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-primary px-6 py-3.5 text-xs uppercase tracking-widest text-primary-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "signin" ? "New to Prayog? " : "Already have an account? "}
        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="link-underline text-foreground"
        >
          {mode === "signin" ? "Create an account" : "Sign in"}
        </button>
      </p>
      <p className="mt-8 text-xs text-muted-foreground">
        <Link to="/" className="link-underline">← Back to home</Link>
      </p>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block eyebrow mb-2">{label}</span>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-input rounded-sm px-3 py-3 text-sm focus:outline-none focus:border-accent"
      />
    </label>
  );
}

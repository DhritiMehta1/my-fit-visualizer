import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { SiteLogo } from "@/components/atelier/SiteLogo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Atelier fitting room" },
      {
        name: "description",
        content: "Sign in to save your 3D body model, your closet and the looks you build.",
      },
      { property: "og:title", content: "Sign in — Atelier fitting room" },
      {
        property: "og:description",
        content: "Save your 3D body model, closet and looks.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/studio" });
  }, [user, loading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + "/studio",
            data: { display_name: name || email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          toast.success("Check your email to confirm your account.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/studio" });
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between border-r border-border p-10 md:flex">
          <SiteLogo className="h-14" />
          <div className="max-w-sm">
            <p className="eyebrow">The fitting room</p>
            <h1 className="mt-3 text-4xl leading-tight">
              Your measurements become a model. Your cart becomes an outfit.
            </h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Body photos stay private to your account.
          </p>
        </div>

        <div className="flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <p className="eyebrow">{mode === "signin" ? "Welcome back" : "Create account"}</p>
            <h2 className="mt-2 text-3xl">{mode === "signin" ? "Sign in" : "Join Atelier"}</h2>

            {sent ? (
              <p className="mt-6 text-sm text-muted-foreground">
                We sent a confirmation link to <span className="text-foreground">{email}</span>.
                Open it to finish setting up your fitting room.
              </p>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-6">
                {mode === "signup" && (
                  <label className="block">
                    <span className="eyebrow">Name</span>
                    <input
                      className="field mt-1 focus:field-focus"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dhriti"
                    />
                  </label>
                )}
                <label className="block">
                  <span className="eyebrow">Email</span>
                  <input
                    type="email"
                    required
                    className="field mt-1 focus:field-focus"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                  />
                </label>
                <label className="block">
                  <span className="eyebrow">Password</span>
                  <input
                    type="password"
                    required
                    minLength={6}
                    className="field mt-1 focus:field-focus"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </label>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-primary px-5 py-3 text-xs uppercase tracking-[0.24em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "One moment" : mode === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>
            )}

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="eyebrow">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <button
              onClick={google}
              className="w-full border border-border px-5 py-3 text-xs uppercase tracking-[0.24em] transition-colors hover:bg-secondary"
            >
              Continue with Google
            </button>

            <button
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setSent(false);
              }}
              className="mt-6 text-xs text-muted-foreground underline underline-offset-4"
            >
              {mode === "signin"
                ? "No account yet? Create one"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

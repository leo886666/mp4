"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Loader2, ShieldCheck, ChevronLeft, ChevronRight } from "@/components/icons";
import { Button } from "@/components/ui";
import { PROVIDERS, useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/data";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const { signIn, signInWithEmail } = useAuth();

  const [mode, setMode] = useState<"providers" | "email">("providers");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [needsPassword, setNeedsPassword] = useState<string | null>(null);
  const [linkSent, setLinkSent] = useState<{ email: string; devLink?: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    params.get("error") === "link_expired" ? "That sign-in link expired. Enter your email to get a new one." : null
  );

  async function oauth(provider: "google" | "x" | "telegram") {
    setError(null);
    setBusy(provider);
    try {
      await signIn(provider);
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Sign-in failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    setBusy("email");
    try {
      const res = await signInWithEmail(email, { password: password || undefined, next });
      if (res.requiresPassword) {
        setNeedsPassword(res.name ?? email);
        return;
      }
      if (res.sent) {
        setLinkSent({ email, devLink: res.devLink });
        return;
      }
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Couldn't sign you in.");
    } finally {
      setBusy(null);
    }
  }

  function openEmail() {
    setMode("email");
    setError(null);
  }

  function backToProviders() {
    setMode("providers");
    setNeedsPassword(null);
    setPassword("");
    setLinkSent(null);
    setError(null);
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-inv items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white -ml-px" />
          </span>
          <h1 className="font-display text-[30px] tracking-tight mt-4">Welcome back</h1>
          <p className="text-[14px] text-ink-mute mt-1.5">
            {mode === "email" ? "One email address is all it takes." : "Pick how you'd like to sign in."}
          </p>
        </div>

        {linkSent ? (
          <div className="mt-8 rounded-2xl ring-1 ring-line p-6 text-center">
            <p className="text-[15px] font-semibold">Check your inbox</p>
            <p className="text-[13px] text-ink-mute mt-1.5 leading-relaxed">
              We sent a one-time sign-in link to <span className="text-ink font-medium">{linkSent.email}</span>. It expires in 15 minutes.
            </p>
            {linkSent.devLink && (
              <a
                href={linkSent.devLink}
                className="mt-4 inline-flex items-center gap-1 text-[12.5px] font-semibold text-ember hover:underline"
              >
                No mail provider configured — open the link <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
            <button onClick={backToProviders} className="mt-5 block w-full text-[12.5px] text-ink-mute hover:text-ink transition-colors">
              Use a different address
            </button>
          </div>
        ) : mode === "providers" ? (
          <div className="mt-8 space-y-2.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => (p.id === "email" ? openEmail() : oauth(p.id as "google" | "x" | "telegram"))}
                disabled={!!busy}
                className={cn(
                  "w-full h-12 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60",
                  p.cls
                )}
              >
                {busy === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className={cn("inline-flex", p.markCls)}>
                    <p.Mark className="w-[18px] h-[18px]" />
                  </span>
                )}
                {p.label}
              </button>
            ))}
            {error && <p className="text-[13px] text-ember text-center pt-1">{error}</p>}
          </div>
        ) : (
          <form onSubmit={submitEmail} className="mt-8">
            <button
              type="button"
              onClick={backToProviders}
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink-mute hover:text-ink transition-colors mb-4"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> All sign-in options
            </button>

            <div className="space-y-3">
              <input
                type="email"
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setNeedsPassword(null);
                  setPassword("");
                }}
                placeholder="Email address"
                autoComplete="email"
                className="w-full h-12 rounded-2xl ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow bg-paper"
              />

              {needsPassword && (
                <div className="animate-fade-up">
                  <p className="text-[12.5px] text-ink-mute mb-2">
                    <span className="text-ink font-medium">{needsPassword}</span> has a password on file — enter it to continue.
                  </p>
                  <input
                    type="password"
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full h-12 rounded-2xl ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow bg-paper"
                  />
                </div>
              )}

              {error && <p className="text-[13px] text-ember">{error}</p>}

              <Button type="submit" size="lg" className="w-full" disabled={busy === "email"}>
                {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Continue
              </Button>
              <p className="text-[11.5px] text-ink-faint text-center leading-relaxed">
                New here? The same field creates your account — no password needed.
              </p>
            </div>
          </form>
        )}

        <p className="text-center text-[13px] text-ink-mute mt-7">
          Want a password on your {BRAND} account?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-semibold text-ink hover:text-ember transition-colors">
            Create one
          </Link>
        </p>

        <div className="mt-6 rounded-2xl bg-wash ring-1 ring-line p-4">
          <p className="text-[11.5px] font-semibold tracking-wide text-ink-faint uppercase">Demo accounts</p>
          <div className="mt-2 space-y-1 text-[12px] text-ink-mute tabular-nums">
            <p><span className="text-ink font-medium">demo@vesper.app</span> · viewer with VIP</p>
            <p><span className="text-ink font-medium">creator@vesper.app</span> · Creator Studio</p>
            <p><span className="text-ink font-medium">admin@vesper.app</span> · Ops Console</p>
            <p className="text-ink-faint pt-1">password: vesper2026 — these ask for it, new addresses don't</p>
          </div>
        </div>

        <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-faint mt-6 text-center">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>
            By continuing you agree to our{" "}
            <Link href="/legal/terms" className="underline hover:text-ink-mute">Terms</Link> and{" "}
            <Link href="/legal/privacy" className="underline hover:text-ink-mute">Privacy Policy</Link>.
          </span>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-mute text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

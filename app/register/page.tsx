"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play, Loader2, ShieldCheck, Check } from "@/components/icons";
import { Button } from "@/components/ui";
import { PROVIDERS, useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/data";

const PERKS = [
  "Keep your place in every series, on every device",
  "Build a list and get notified when it updates",
  "First episodes of all 39 series are free, always",
];

function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";
  const { signIn, register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function oauth(provider: "google" | "x" | "telegram") {
    setError(null);
    setBusy(provider);
    try {
      await signIn(provider);
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Sign-up failed. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 2) return setError("Tell us what to call you.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Use at least 8 characters for your password.");
    setBusy("email");
    try {
      await register({ name: name.trim(), email, password });
      router.push(next);
      router.refresh();
    } catch (e: any) {
      setError(e?.message ?? "Couldn't create that account.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px] animate-fade-up">
        <div className="text-center">
          <span className="inline-flex w-12 h-12 rounded-2xl bg-inv items-center justify-center">
            <Play className="w-5 h-5 fill-white text-white -ml-px" />
          </span>
          <h1 className="font-display text-[30px] tracking-tight mt-4">Create your account</h1>
          <p className="text-[14px] text-ink-mute mt-1.5">Free forever. No card required.</p>
        </div>

        <ul className="mt-6 space-y-2">
          {PERKS.map((p) => (
            <li key={p} className="flex items-start gap-2.5 text-[13px] text-ink-soft">
              <span className="w-4 h-4 rounded-full bg-ember-tint text-ember flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
              </span>
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-6 space-y-2.5">
          {PROVIDERS.filter((p) => p.id !== "email").map((p) => (
            <button
              key={p.id}
              onClick={() => oauth(p.id as "google" | "x" | "telegram")}
              disabled={!!busy}
              className={`w-full h-12 rounded-full text-[14px] font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 ${p.cls}`}
            >
              {busy === p.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className={`inline-flex ${p.markCls}`}>
                  <p.Mark className="w-[18px] h-[18px]" />
                </span>
              )}
              {p.label.replace("Continue", "Sign up")}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 my-7">
          <div className="h-px bg-line flex-1" />
          <span className="text-[12px] text-ink-faint">or with email</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className="w-full h-12 rounded-2xl ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow bg-paper"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            className="w-full h-12 rounded-2xl ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow bg-paper"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (8+ characters)"
            autoComplete="new-password"
            className="w-full h-12 rounded-2xl ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow bg-paper"
          />
          {error && <p className="text-[13px] text-ember">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={!!busy}>
            {busy === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create account"}
          </Button>
        </form>

        <p className="text-center text-[13px] text-ink-mute mt-6">
          Already on {BRAND}?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-ink hover:text-ember transition-colors">
            Log in
          </Link>
        </p>
        <p className="flex items-center justify-center gap-1.5 text-[11px] text-ink-faint mt-6 text-center">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>
            By creating an account you agree to our{" "}
            <Link href="/legal/terms" className="underline hover:text-ink-mute">Terms</Link> and{" "}
            <Link href="/legal/privacy" className="underline hover:text-ink-mute">Privacy Policy</Link>.
          </span>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-mute text-sm">Loading…</div>}>
      <RegisterForm />
    </Suspense>
  );
}

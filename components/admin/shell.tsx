"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BarChart3, Film, Users, Wallet, Megaphone, ShieldCheck, Settings, FileText,
  Loader2, LogOut, AlertTriangle, Layers,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui";
import { api } from "@/lib/client/api";
import { setConsoleSession, useConsole, type ConsoleSession } from "@/lib/client/console";

export { useConsole } from "@/lib/client/console";
export type { ConsoleSession } from "@/lib/client/console";

const TABS = [
  { href: "/admin", label: "Overview", icon: BarChart3, perm: "console.view" },
  { href: "/admin/users", label: "Users", icon: Users, perm: "users.read" },
  { href: "/admin/revenue", label: "Payments", icon: Wallet, perm: "orders.read" },
  { href: "/admin/content", label: "Content", icon: Film, perm: "content.read" },
  { href: "/admin/reviews", label: "Review queue", icon: Layers, perm: "review.decide" },
  { href: "/admin/reports", label: "Reports", icon: AlertTriangle, perm: "reports.handle" },
  { href: "/admin/promotion", label: "Promotion", icon: Megaphone, perm: "console.view" },
  { href: "/admin/payouts", label: "Payouts", icon: ShieldCheck, perm: "console.view" },
  { href: "/admin/settings", label: "Settings", icon: Settings, perm: "console.view" },
  { href: "/admin/audit", label: "Audit log", icon: FileText, perm: "audit.read" },
];

/** Console login — separate cookie scope from the viewer session. */
function ConsoleLogin({ onSignedIn }: { onSignedIn: (s: ConsoleSession) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<ConsoleSession>("/api/auth/admin", { email, password });
      onSignedIn(res);
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-wash flex items-center justify-center px-5">
      <form onSubmit={submit} className="w-full max-w-[380px] rounded-2xl bg-paper ring-1 ring-line p-7 animate-fade-up">
        <div className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-inv flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" strokeWidth={2.2} />
          </span>
          <div>
            <p className="font-display text-lg tracking-[0.16em] leading-none">VESPER</p>
            <p className="text-[11px] font-semibold tracking-widest text-ink-faint uppercase mt-1">Ops Console</p>
          </div>
        </div>
        <h1 className="font-display text-[22px] tracking-tight mt-6">Staff sign-in</h1>
        <p className="text-[12.5px] text-ink-mute mt-1">Viewer accounts can't open the console.</p>

        <div className="mt-5 space-y-3">
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@vesper.app" autoComplete="username"
            className="w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none transition-shadow"
          />
          <input
            type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="Password" autoComplete="current-password"
            className="w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none transition-shadow"
          />
          {error && <p className="text-[12.5px] text-ember">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Sign in
          </Button>
        </div>

        <div className="mt-6 rounded-xl bg-wash ring-1 ring-line p-3.5 text-[12px] text-ink-mute space-y-0.5">
          <p className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase mb-1.5">Seeded staff</p>
          <p><span className="text-ink font-medium">owner@vesper.app</span> — full access</p>
          <p><span className="text-ink font-medium">admin@vesper.app</span> — no settings write</p>
          <p><span className="text-ink font-medium">reviewer@vesper.app</span> — review + reports only</p>
          <p className="text-ink-faint pt-1">password: vesper2026</p>
        </div>
        <Link href="/" className="block text-center text-[12.5px] text-ink-mute hover:text-ink transition-colors mt-5">← Back to VESPER</Link>
      </form>
    </div>
  );
}

export function AdminShell({ title, sub, actions, children }: {
  title: string;
  sub?: string;
  actions?: React.ReactNode | ((s: ConsoleSession) => React.ReactNode);
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, ready, refresh } = useConsole();

  if (!ready || !session) {
    return (
      <div className="min-h-screen bg-wash flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  if (!session.user) return <ConsoleLogin onSignedIn={setConsoleSession} />;

  const tabs = TABS.filter((t) => session.permissions.includes(t.perm));
  const actionNode = typeof actions === "function" ? actions(session) : actions;

  return (
    <div className="min-h-screen bg-paper">
      <header className="sticky top-0 z-40 bg-wash/90 backdrop-blur-xl hairline-b">
        <div className="mx-auto max-w-[1320px] px-5 lg:px-8 h-14 flex items-center gap-5">
          <Link href="/" className="font-display text-lg tracking-[0.16em] shrink-0">VESPER</Link>
          <span className="h-4 w-px bg-line" />
          <span className="text-[12px] font-semibold tracking-widest uppercase text-ink-faint shrink-0 hidden sm:block">Ops Console</span>
          <nav className="flex-1 flex gap-1 overflow-x-auto no-scrollbar">
            {tabs.map((t) => {
              const active = pathname === t.href;
              const Icon = t.icon;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={cn(
                    "h-8 px-3 inline-flex items-center gap-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap transition-colors",
                    active ? "bg-inv text-white" : "text-ink-mute hover:bg-wash hover:text-ink"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" strokeWidth={2} />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          <ThemeToggle className="shrink-0" />
          <div className="shrink-0 hidden sm:flex items-center gap-2 text-[12px]">
            <span className="text-ink-mute">{session.user.name}</span>
            <span className="h-5 px-2 inline-flex items-center rounded-full bg-inv text-white text-[10.5px] font-semibold">{session.roleLabel}</span>
          </div>
          <button
            onClick={async () => {
              await api.del("/api/auth/admin").catch(() => {});
              setConsoleSession({ user: null, permissions: [] });
              router.refresh();
            }}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-ink-mute hover:text-ink hover:bg-wash transition-colors"
            aria-label="Sign out of the console"
          >
            <LogOut className="w-4 h-4" strokeWidth={1.9} />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1320px] px-5 lg:px-8 py-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-[26px] tracking-tight">{title}</h1>
            {sub && <p className="text-[13px] text-ink-mute mt-1">{sub}</p>}
          </div>
          {actionNode}
        </div>
        <div className="mt-6">{children}</div>
      </main>
    </div>
  );
}

/* ------------------------------ shared bits ------------------------------- */

export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 mb-4">{children}</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-9 w-[220px] rounded-full bg-wash ring-1 ring-line focus:ring-ink px-4 text-[13px] outline-none transition-shadow"
    />
  );
}

export function FilterPills({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 px-3.5 rounded-full text-[12.5px] font-medium transition-colors",
            value === o.id ? "bg-inv text-white" : "bg-wash text-ink-mute hover:text-ink ring-1 ring-line"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="text-[12px] text-ink-faint mt-3">{total} rows</p>;
  return (
    <div className="flex items-center gap-3 mt-4">
      <button onClick={() => onPage(page - 1)} disabled={page <= 1} className="h-9 px-4 rounded-full ring-1 ring-line text-[12.5px] font-medium disabled:opacity-40 hover:bg-wash transition-colors">Previous</button>
      <span className="text-[12.5px] text-ink-mute tabular-nums">Page {page} / {pages} · {total.toLocaleString()} rows</span>
      <button onClick={() => onPage(page + 1)} disabled={page >= pages} className="h-9 px-4 rounded-full ring-1 ring-line text-[12.5px] font-medium disabled:opacity-40 hover:bg-wash transition-colors">Next</button>
    </div>
  );
}

export function Table({ head, children, minWidth = 900 }: { head: React.ReactNode; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="rounded-2xl ring-1 ring-line bg-wash overflow-x-auto">
      <table className="w-full text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="bg-wash text-left text-[11px] font-semibold tracking-wide text-ink-mute uppercase">{head}</tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    ["paid", "published", "active", "resolved", "approved", "ready", "done"].includes(status) ? "bg-emerald-50 text-emerald-700" :
    ["pending", "review", "queued", "processing", "scheduled", "running"].includes(status) ? "bg-gold-tint text-gold" :
    ["refunded", "failed", "rejected", "suspended", "reported", "open", "hold"].includes(status) ? "bg-ember-tint text-ember" :
    "bg-wash text-ink-mute ring-1 ring-line";
  return <span className={cn("inline-flex h-6 px-2.5 items-center rounded-full text-[11px] font-semibold capitalize", tone)}>{status}</span>;
}

export function Loading() {
  return (
    <div className="py-24 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
    </div>
  );
}

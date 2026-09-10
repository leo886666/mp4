"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { GoogleMark, XMark, TelegramMark, MailMark } from "@/components/icons";
import { api, ApiError, track } from "@/lib/client/api";

export type AuthProviderId = "google" | "x" | "telegram" | "email";

export interface User {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  role: "user" | "creator" | "reviewer" | "admin" | "owner";
  vip: boolean;
  vipUntil: number;
  coins: number;
  avatarUrl?: string | null;
}

export interface Subscription {
  id: string;
  planId: string;
  status: string;
  autoRenew: boolean;
  currentPeriodEnd: number;
}

export interface EmailSignInResult {
  user?: User;
  /** the address belongs to a password account (all staff) — ask for it */
  requiresPassword?: boolean;
  name?: string;
  /** VESPER_EMAIL_SIGNIN=link — a magic link was mailed instead */
  sent?: boolean;
  devLink?: string;
  created?: boolean;
}

interface AuthState {
  user: User | null;
  subscription: Subscription | null;
  stats: { orders: number; spentCents: number; watched: number; favorites: number; minutes: number } | null;
  unread: number;
  ready: boolean;
  signIn: (provider: AuthProviderId, opts?: { email?: string; password?: string; name?: string }) => Promise<User>;
  signInWithEmail: (email: string, opts?: { password?: string; next?: string }) => Promise<EmailSignInResult>;
  register: (opts: { email: string; password: string; name: string }) => Promise<User>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

interface MeResponse {
  user: User | null;
  subscription: Subscription | null;
  stats: AuthState["stats"];
  unread: number;
}

/**
 * Session-backed auth.
 *
 * The httpOnly cookie is the source of truth — this context is just a cache of
 * /api/auth/me. Nothing about the user is trusted from localStorage, so a
 * revoked session disappears on the next refresh instead of lingering.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MeResponse>({ user: null, subscription: null, stats: null, unread: 0 });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const me = await api.get<MeResponse>("/api/auth/me");
      setState({ user: me.user, subscription: me.subscription ?? null, stats: me.stats ?? null, unread: me.unread ?? 0 });
    } catch {
      setState({ user: null, subscription: null, stats: null, unread: 0 });
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (provider: AuthProviderId, opts?: { email?: string; password?: string; name?: string }) => {
      const res =
        provider === "email"
          ? await api.post<{ user: User }>("/api/auth/login", { email: opts?.email, password: opts?.password })
          : await api.post<{ user: User }>(`/api/auth/oauth/${provider}`, {
              email: opts?.email,
              name: opts?.name,
              handle: opts?.email?.split("@")[0],
            });
      await refresh();
      track("session_start", { props: { provider } });
      return res.user;
    },
    [refresh]
  );

  /** Email behaves like any other provider: one field, no password by default. */
  const signInWithEmail = useCallback(
    async (email: string, opts?: { password?: string; next?: string }) => {
      const res = await api.post<EmailSignInResult>("/api/auth/email", {
        email,
        password: opts?.password,
        next: opts?.next,
      });
      if (res.user) {
        await refresh();
        track("session_start", { props: { provider: "email" } });
      }
      return res;
    },
    [refresh]
  );

  const register = useCallback(
    async (opts: { email: string; password: string; name: string }) => {
      const res = await api.post<{ user: User }>("/api/auth/register", opts);
      await refresh();
      return res.user;
    },
    [refresh]
  );

  const signOut = useCallback(async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {
      /* already gone */
    }
    setState({ user: null, subscription: null, stats: null, unread: 0 });
  }, []);

  const value = useMemo<AuthState>(
    () => ({ ...state, ready, signIn, signInWithEmail, register, signOut, refresh }),
    [state, ready, signIn, signInWithEmail, register, signOut, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { ApiError };

/**
 * Sign-in providers.
 *
 * All four render as the same white card so no single option looks like the
 * "real" one — the brand mark is the only differentiator. Email is a provider
 * here, not a separate form: one field, no password (see /api/auth/email).
 */
export const PROVIDERS: {
  id: AuthProviderId;
  label: string;
  short: string;
  Mark: (p: { className?: string }) => React.ReactNode;
  cls: string;
  markCls: string;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    short: "Google",
    Mark: GoogleMark,
    cls: "bg-paper text-ink ring-1 ring-line hover:ring-ink-faint hover:bg-wash/50",
    markCls: "",
  },
  {
    id: "x",
    label: "Continue with X",
    short: "X",
    Mark: XMark,
    cls: "bg-paper text-ink ring-1 ring-line hover:ring-ink-faint hover:bg-wash/50",
    markCls: "text-ink",
  },
  {
    id: "telegram",
    label: "Continue with Telegram",
    short: "Telegram",
    Mark: TelegramMark,
    cls: "bg-paper text-ink ring-1 ring-line hover:ring-ink-faint hover:bg-wash/50",
    markCls: "text-[#229ED9]",
  },
  {
    id: "email",
    label: "Continue with email",
    short: "Email",
    Mark: MailMark,
    cls: "bg-paper text-ink ring-1 ring-line hover:ring-ink-faint hover:bg-wash/50",
    markCls: "text-ink-soft",
  },
];

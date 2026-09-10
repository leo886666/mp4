"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

export interface ConsoleSession {
  user: { id: string; name: string; email: string | null; initials: string; role: string } | null;
  role?: string;
  roleLabel?: string;
  permissions: string[];
}

const EMPTY: ConsoleSession = { user: null, permissions: [] };

/**
 * Console session store.
 *
 * Shared across the shell and every page so a page can wait for the session
 * before it fetches — and so its permission checks see the real role rather
 * than an empty default. One request per tab, broadcast to all subscribers.
 */
let cache: ConsoleSession | null = null;
let inflight: Promise<ConsoleSession> | null = null;
const subscribers = new Set<(s: ConsoleSession) => void>();

function broadcast(session: ConsoleSession) {
  cache = session;
  subscribers.forEach((fn) => fn(session));
}

export async function loadConsoleSession(force = false): Promise<ConsoleSession> {
  if (cache && !force) return cache;
  if (!inflight || force) {
    inflight = api
      .get<ConsoleSession>("/api/auth/admin")
      .catch(() => EMPTY)
      .then((s) => {
        broadcast(s);
        inflight = null;
        return s;
      });
  }
  return inflight;
}

export function setConsoleSession(session: ConsoleSession) {
  broadcast(session);
}

export function useConsole() {
  const [session, setSession] = useState<ConsoleSession | null>(cache);

  useEffect(() => {
    subscribers.add(setSession);
    if (!cache) void loadConsoleSession();
    else setSession(cache);
    return () => {
      subscribers.delete(setSession);
    };
  }, []);

  const refresh = useCallback(() => loadConsoleSession(true), []);

  return {
    session,
    user: session?.user ?? null,
    permissions: session?.permissions ?? [],
    roleLabel: session?.roleLabel,
    role: session?.role,
    ready: session !== null,
    refresh,
    signIn: setConsoleSession,
  };
}

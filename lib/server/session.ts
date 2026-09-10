import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { all, get, insert, now, run } from "./db";
import { newId } from "./ids";
import { randomToken, sha256 } from "./crypto";
import { env } from "./env";
import { findById, toPublic, touch, type PublicUser, type UserRow } from "./repo/users";
import { forbidden, unauthorized } from "./http";
import { atLeast, can, type Permission, type Role } from "./rbac";

export type SessionScope = "site" | "admin";

export const COOKIE: Record<SessionScope, string> = {
  site: "vesper_sid",
  admin: "vesper_admin_sid",
};

export function createSession(userId: string, scope: SessionScope, meta: { ip?: string; ua?: string } = {}) {
  const token = randomToken(32);
  const ts = now();
  const expiresAt = ts + env.sessionDays * 86400_000;
  insert("sessions", {
    id: newId("ses"),
    user_id: userId,
    token_hash: sha256(token),
    scope,
    user_agent: meta.ua ?? null,
    ip: meta.ip ?? null,
    created_at: ts,
    expires_at: expiresAt,
    revoked_at: null,
  });
  return { token, expiresAt };
}

export function revokeSession(token: string) {
  run("UPDATE sessions SET revoked_at = ? WHERE token_hash = ?", now(), sha256(token));
}

export function revokeAllForUser(userId: string) {
  run("UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL", now(), userId);
}

export function userForToken(token: string | undefined, scope: SessionScope): UserRow | null {
  if (!token) return null;
  const row = get<{ user_id: string }>(
    "SELECT user_id FROM sessions WHERE token_hash = ? AND scope = ? AND revoked_at IS NULL AND expires_at > ?",
    sha256(token),
    scope,
    now()
  );
  if (!row) return null;
  const user = findById(row.user_id);
  if (!user || user.status !== "active") return null;
  return user;
}

/* ------------------------------ request side ------------------------------ */

export function currentUserRow(scope: SessionScope = "site"): UserRow | null {
  const token = cookies().get(COOKIE[scope])?.value;
  const user = userForToken(token, scope);
  if (user) touch(user.id);
  return user;
}

export function currentUser(scope: SessionScope = "site"): PublicUser | null {
  const row = currentUserRow(scope);
  return row ? toPublic(row) : null;
}

export function requireUser(scope: SessionScope = "site"): UserRow {
  const u = currentUserRow(scope);
  if (!u) throw unauthorized();
  return u;
}

export function requireRole(min: Role, scope: SessionScope = "site"): UserRow {
  const u = requireUser(scope);
  if (!atLeast(u.role, min)) throw forbidden(`Requires ${min} role`);
  return u;
}

/** Console guard: admin-scoped cookie + explicit permission. */
export function requirePerm(perm: Permission): UserRow {
  const u = requireUser("admin");
  if (!can(u.role, perm)) throw forbidden(`Missing permission: ${perm}`);
  return u;
}

export function optionalUser(scope: SessionScope = "site"): UserRow | null {
  try {
    return currentUserRow(scope);
  } catch {
    return null;
  }
}

/* ------------------------------ response side ----------------------------- */

export function setSessionCookie(res: NextResponse, token: string, scope: SessionScope, expiresAt: number) {
  res.cookies.set(COOKIE[scope], token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
  return res;
}

export function clearSessionCookie(res: NextResponse, scope: SessionScope) {
  res.cookies.set(COOKIE[scope], "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}

export function sessionsForUser(userId: string) {
  return all("SELECT id, scope, ip, user_agent, created_at, expires_at, revoked_at FROM sessions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20", userId);
}

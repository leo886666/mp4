import { all, count, get, insert, now, run, update } from "../db";
import { newId } from "../ids";
import type { Role } from "../rbac";

export interface UserRow {
  id: string;
  email: string | null;
  name: string;
  initials: string;
  avatar_url: string | null;
  password_hash: string | null;
  role: Role;
  status: "active" | "suspended" | "deleted";
  vip_until: number;
  coins: number;
  country: string | null;
  locale: string | null;
  channel: string | null;
  campaign_id: string | null;
  created_at: number;
  updated_at: number;
  last_seen_at: number | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string | null;
  initials: string;
  avatarUrl: string | null;
  role: Role;
  status: string;
  vip: boolean;
  vipUntil: number;
  coins: number;
  createdAt: number;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const s = parts.map((w) => w[0]).slice(0, 2).join("");
  return (s || name.slice(0, 2) || "VU").toUpperCase();
}

export const isVip = (u: Pick<UserRow, "vip_until">) => (u.vip_until ?? 0) > Date.now();

export function toPublic(u: UserRow): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    initials: u.initials,
    avatarUrl: u.avatar_url,
    role: u.role,
    status: u.status,
    vip: isVip(u),
    vipUntil: u.vip_until ?? 0,
    coins: u.coins ?? 0,
    createdAt: u.created_at,
  };
}

export function findById(id: string): UserRow | null {
  return get<UserRow>("SELECT * FROM users WHERE id = ?", id);
}

export function findByEmail(email: string): UserRow | null {
  return get<UserRow>("SELECT * FROM users WHERE email = ?", email.toLowerCase());
}

export function createUser(input: {
  email?: string | null;
  name: string;
  passwordHash?: string | null;
  role?: Role;
  country?: string;
  channel?: string;
  campaignId?: string | null;
  vipUntil?: number;
  id?: string;
  createdAt?: number;
}): UserRow {
  const ts = input.createdAt ?? now();
  const id = input.id ?? newId("usr");
  insert("users", {
    id,
    email: input.email ? input.email.toLowerCase() : null,
    name: input.name,
    initials: initialsOf(input.name),
    password_hash: input.passwordHash ?? null,
    role: input.role ?? "user",
    status: "active",
    vip_until: input.vipUntil ?? 0,
    coins: 0,
    country: input.country ?? "US",
    locale: "en",
    channel: input.channel ?? "organic",
    campaign_id: input.campaignId ?? null,
    created_at: ts,
    updated_at: ts,
    last_seen_at: ts,
  });
  return findById(id)!;
}

export function patchUser(id: string, patch: Record<string, any>) {
  update("users", id, { ...patch, updated_at: now() });
  return findById(id);
}

export function touch(id: string) {
  run("UPDATE users SET last_seen_at = ? WHERE id = ?", now(), id);
}

export function grantVip(userId: string, days: number): number {
  const u = findById(userId);
  if (!u) return 0;
  const base = Math.max(u.vip_until ?? 0, now());
  const until = base + days * 86400_000;
  run("UPDATE users SET vip_until = ?, updated_at = ? WHERE id = ?", until, now(), userId);
  return until;
}

export interface UserQuery {
  q?: string;
  role?: string;
  status?: string;
  vip?: "1" | "0" | "";
  offset: number;
  limit: number;
  sort?: string;
}

export function listUsers(query: UserQuery) {
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (query.q) {
    where.push("(name LIKE ? OR email LIKE ? OR id LIKE ?)");
    const like = `%${query.q}%`;
    params.push(like, like, like);
  }
  if (query.role) {
    where.push("role = ?");
    params.push(query.role);
  }
  if (query.status) {
    where.push("status = ?");
    params.push(query.status);
  }
  if (query.vip === "1") where.push(`vip_until > ${Date.now()}`);
  if (query.vip === "0") where.push(`vip_until <= ${Date.now()}`);

  const sortMap: Record<string, string> = {
    created: "created_at DESC",
    seen: "last_seen_at DESC",
    name: "name ASC",
  };
  const order = sortMap[query.sort || "created"] ?? "created_at DESC";
  const w = where.join(" AND ");
  const rows = all<UserRow>(`SELECT * FROM users WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, query.limit, query.offset);
  const total = count(`SELECT COUNT(*) FROM users WHERE ${w}`, ...params);
  return { rows, total };
}

export function userStats(userId: string) {
  return {
    orders: count("SELECT COUNT(*) FROM orders WHERE user_id = ? AND status = 'paid'", userId),
    spentCents: count("SELECT COALESCE(SUM(amount_cents - discount_cents),0) FROM orders WHERE user_id = ? AND status = 'paid'", userId),
    watched: count("SELECT COUNT(*) FROM watch_progress WHERE user_id = ?", userId),
    favorites: count("SELECT COUNT(*) FROM favorites WHERE user_id = ?", userId),
    minutes: Math.round(
      count("SELECT COALESCE(SUM(position_s),0) FROM watch_progress WHERE user_id = ?", userId) / 60
    ),
  };
}

import { all, count, get, insert, json, now, run, scalar, tx, update } from "../db";
import { newId } from "../ids";
import { grantVip } from "./users";

/* ---------------------------------- plans --------------------------------- */

export interface PlanRow {
  id: string; name: string; price_cents: number; period: string; days: number;
  per_month_cents: number | null; badge: string | null; savings: string | null;
  highlight: number; active: number; sort: number;
}

export const listPlans = (onlyActive = true) =>
  all<PlanRow>(`SELECT * FROM plans ${onlyActive ? "WHERE active = 1" : ""} ORDER BY sort ASC`);

export const getPlan = (id: string) => get<PlanRow>("SELECT * FROM plans WHERE id = ?", id);

export function toPlan(p: PlanRow) {
  return {
    id: p.id,
    name: p.name,
    price: p.price_cents / 100,
    period: p.period,
    days: p.days,
    perMonth: p.per_month_cents ? p.per_month_cents / 100 : undefined,
    badge: p.badge ?? undefined,
    savings: p.savings ?? undefined,
    highlight: !!p.highlight,
  };
}

/* --------------------------------- coupons -------------------------------- */

export interface CouponRow {
  code: string; kind: "percent" | "amount"; value: number; plan_ids: string;
  max_uses: number; used: number; starts_at: number | null; ends_at: number | null; active: number;
}

export function validateCoupon(code: string, planId: string | null, amountCents: number) {
  const c = get<CouponRow>("SELECT * FROM coupons WHERE code = ? AND active = 1", code.toUpperCase());
  if (!c) return { valid: false as const, reason: "Code not found" };
  const t = now();
  if (c.starts_at && t < c.starts_at) return { valid: false as const, reason: "Not started yet" };
  if (c.ends_at && t > c.ends_at) return { valid: false as const, reason: "Expired" };
  if (c.max_uses && c.used >= c.max_uses) return { valid: false as const, reason: "Fully redeemed" };
  const plans = json<string[]>(c.plan_ids, []);
  if (plans.length && planId && !plans.includes(planId)) return { valid: false as const, reason: "Not valid for this plan" };
  const discount = c.kind === "percent" ? Math.round((amountCents * c.value) / 100) : Math.min(amountCents, c.value);
  return { valid: true as const, code: c.code, kind: c.kind, value: c.value, discountCents: discount };
}

export const redeemCoupon = (code: string) => run("UPDATE coupons SET used = used + 1 WHERE code = ?", code.toUpperCase());

/* --------------------------------- orders --------------------------------- */

export interface OrderRow {
  id: string; user_id: string; kind: "subscription" | "episode" | "series" | "coins";
  plan_id: string | null; ref_id: string | null; title: string;
  amount_cents: number; discount_cents: number; currency: string;
  status: "pending" | "paid" | "failed" | "refunded" | "canceled";
  gateway: string; gateway_ref: string | null; coupon_code: string | null; country: string | null;
  created_at: number; paid_at: number | null; meta: string;
  user_name?: string; user_email?: string;
}

export function createOrder(input: {
  userId: string; kind: OrderRow["kind"]; title: string; amountCents: number;
  planId?: string | null; refId?: string | null; gateway: string;
  couponCode?: string | null; discountCents?: number; country?: string | null;
  meta?: Record<string, unknown>; id?: string; createdAt?: number; status?: OrderRow["status"];
}): OrderRow {
  const id = input.id ?? newId("ord");
  insert("orders", {
    id,
    user_id: input.userId,
    kind: input.kind,
    plan_id: input.planId ?? null,
    ref_id: input.refId ?? null,
    title: input.title,
    amount_cents: input.amountCents,
    discount_cents: input.discountCents ?? 0,
    currency: "USD",
    status: input.status ?? "pending",
    gateway: input.gateway,
    gateway_ref: null,
    coupon_code: input.couponCode ?? null,
    country: input.country ?? "US",
    created_at: input.createdAt ?? now(),
    paid_at: input.status === "paid" ? (input.createdAt ?? now()) : null,
    meta: JSON.stringify(input.meta ?? {}),
  });
  return getOrder(id)!;
}

export const getOrder = (id: string) => get<OrderRow>("SELECT * FROM orders WHERE id = ?", id);

export const netCents = (o: Pick<OrderRow, "amount_cents" | "discount_cents">) => o.amount_cents - o.discount_cents;

export function listOrders(q: { userId?: string; status?: string; kind?: string; q?: string; limit: number; offset: number }) {
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (q.userId) { where.push("o.user_id = ?"); params.push(q.userId); }
  if (q.status) { where.push("o.status = ?"); params.push(q.status); }
  if (q.kind) { where.push("o.kind = ?"); params.push(q.kind); }
  if (q.q) {
    where.push("(o.id LIKE ? OR o.title LIKE ? OR u.email LIKE ? OR u.name LIKE ?)");
    const like = `%${q.q}%`;
    params.push(like, like, like, like);
  }
  const w = where.join(" AND ");
  const rows = all<OrderRow>(
    `SELECT o.*, u.name AS user_name, u.email AS user_email FROM orders o
     LEFT JOIN users u ON u.id = o.user_id WHERE ${w} ORDER BY o.created_at DESC LIMIT ? OFFSET ?`,
    ...params, q.limit, q.offset
  );
  const total = count(`SELECT COUNT(*) FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE ${w}`, ...params);
  return { rows, total };
}

/* ------------------------------ subscriptions ----------------------------- */

export interface SubscriptionRow {
  id: string; user_id: string; plan_id: string; order_id: string | null;
  status: "active" | "canceled" | "expired"; auto_renew: number;
  started_at: number; current_period_end: number; canceled_at: number | null; gateway: string;
}

export const activeSubscription = (userId: string) =>
  get<SubscriptionRow>(
    "SELECT * FROM subscriptions WHERE user_id = ? AND status = 'active' ORDER BY current_period_end DESC LIMIT 1",
    userId
  );

export function upsertSubscription(input: { userId: string; planId: string; orderId: string; days: number; gateway: string; startedAt?: number }) {
  const ts = input.startedAt ?? now();
  const existing = activeSubscription(input.userId);
  if (existing) {
    const base = Math.max(existing.current_period_end, ts);
    run("UPDATE subscriptions SET plan_id=?, order_id=?, current_period_end=?, auto_renew=1, status='active' WHERE id=?",
      input.planId, input.orderId, base + input.days * 86400_000, existing.id);
    return { ...existing, current_period_end: base + input.days * 86400_000 };
  }
  const id = newId("sub");
  insert("subscriptions", {
    id,
    user_id: input.userId,
    plan_id: input.planId,
    order_id: input.orderId,
    status: "active",
    auto_renew: 1,
    started_at: ts,
    current_period_end: ts + input.days * 86400_000,
    canceled_at: null,
    gateway: input.gateway,
  });
  return get<SubscriptionRow>("SELECT * FROM subscriptions WHERE id = ?", id)!;
}

export function cancelSubscription(userId: string) {
  const sub = activeSubscription(userId);
  if (!sub) return null;
  run("UPDATE subscriptions SET auto_renew = 0, canceled_at = ? WHERE id = ?", now(), sub.id);
  return { ...sub, auto_renew: 0, canceled_at: now() };
}

export function resumeSubscription(userId: string) {
  const sub = activeSubscription(userId);
  if (!sub) return null;
  run("UPDATE subscriptions SET auto_renew = 1, canceled_at = NULL WHERE id = ?", sub.id);
  return { ...sub, auto_renew: 1, canceled_at: null };
}

/* ------------------------------ entitlements ------------------------------ */

export function grantEntitlement(input: { userId: string; kind: "episode" | "series"; refId: string; orderId?: string | null }) {
  const existing = get<{ id: string }>("SELECT id FROM entitlements WHERE user_id=? AND kind=? AND ref_id=?", input.userId, input.kind, input.refId);
  if (existing) return existing.id;
  const id = newId("ent");
  insert("entitlements", {
    id,
    user_id: input.userId,
    kind: input.kind,
    ref_id: input.refId,
    order_id: input.orderId ?? null,
    granted_at: now(),
    expires_at: null,
  });
  return id;
}

export function hasEntitlement(userId: string, kind: "episode" | "series", refId: string) {
  return !!get("SELECT id FROM entitlements WHERE user_id=? AND kind=? AND ref_id=? AND (expires_at IS NULL OR expires_at > ?)", userId, kind, refId, now());
}

export const entitlementsFor = (userId: string) =>
  all<{ kind: string; ref_id: string }>("SELECT kind, ref_id FROM entitlements WHERE user_id = ?", userId);

/* --------------------------------- ledger --------------------------------- */

export function ledgerEntry(input: {
  creatorId: string | null; seriesId: string | null; orderId: string | null;
  kind: "share" | "adjust" | "payout" | "pool"; grossCents: number; shareBps?: number; netCents?: number; note?: string; ts?: number;
}) {
  const id = newId("led");
  const shareBps = input.shareBps ?? 7000;
  const net = input.netCents ?? Math.round((input.grossCents * shareBps) / 10000);
  insert("ledger", {
    id,
    ts: input.ts ?? now(),
    creator_id: input.creatorId,
    series_id: input.seriesId,
    order_id: input.orderId,
    kind: input.kind,
    gross_cents: input.grossCents,
    share_bps: shareBps,
    net_cents: net,
    note: input.note ?? null,
  });
  if (input.creatorId && net) run("UPDATE creators SET balance_cents = balance_cents + ? WHERE id = ?", net, input.creatorId);
  return id;
}

export const creatorEarnings = (creatorId: string, sinceTs = 0) => ({
  gross: count("SELECT COALESCE(SUM(gross_cents),0) FROM ledger WHERE creator_id = ? AND ts >= ? AND kind IN ('share','pool')", creatorId, sinceTs),
  net: count("SELECT COALESCE(SUM(net_cents),0) FROM ledger WHERE creator_id = ? AND ts >= ? AND kind IN ('share','pool')", creatorId, sinceTs),
  balance: count("SELECT COALESCE(balance_cents,0) FROM creators WHERE id = ?", creatorId),
});

export const creatorLedger = (creatorId: string, limit = 40) =>
  all(`SELECT l.*, s.title AS series_title FROM ledger l LEFT JOIN series s ON s.id = l.series_id
       WHERE l.creator_id = ? ORDER BY l.ts DESC LIMIT ?`, creatorId, limit);

/* --------------------------------- payouts -------------------------------- */

export function listPayouts(q: { creatorId?: string; status?: string; limit: number; offset: number }) {
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (q.creatorId) { where.push("p.creator_id = ?"); params.push(q.creatorId); }
  if (q.status) { where.push("p.status = ?"); params.push(q.status); }
  const w = where.join(" AND ");
  return {
    rows: all(`SELECT p.*, c.name AS creator_name FROM payouts p LEFT JOIN creators c ON c.id = p.creator_id
               WHERE ${w} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`, ...params, q.limit, q.offset),
    total: count(`SELECT COUNT(*) FROM payouts p WHERE ${w}`, ...params),
  };
}

export function createPayout(input: { creatorId: string; period: string; grossCents: number; netCents: number; status?: string; scheduledAt?: number | null; note?: string }) {
  const id = newId("pay");
  insert("payouts", {
    id,
    creator_id: input.creatorId,
    period: input.period,
    gross_cents: input.grossCents,
    net_cents: input.netCents,
    status: input.status ?? "pending",
    method: "bank",
    scheduled_at: input.scheduledAt ?? null,
    paid_at: null,
    note: input.note ?? null,
    created_at: now(),
  });
  return id;
}

export function markPayout(id: string, status: string, operatorId: string) {
  const p = get<{ creator_id: string; net_cents: number; status: string }>("SELECT creator_id, net_cents, status FROM payouts WHERE id = ?", id);
  if (!p) return null;
  update("payouts", id, { status, operator_id: operatorId, paid_at: status === "paid" ? now() : null });
  if (status === "paid" && p.status !== "paid") {
    run("UPDATE creators SET balance_cents = MAX(0, balance_cents - ?) WHERE id = ?", p.net_cents, p.creator_id);
    ledgerEntry({ creatorId: p.creator_id, seriesId: null, orderId: null, kind: "payout", grossCents: 0, netCents: -p.net_cents, note: `Payout ${id}` });
  }
  return get("SELECT * FROM payouts WHERE id = ?", id);
}

/**
 * Monthly settlement: the VIP subscription pool is split across creators by
 * watch minutes in the period; PPE revenue was already attributed per order.
 */
export function settlePeriod(period: string, operatorId: string) {
  const [y, m] = period.split("-").map((x) => parseInt(x, 10));
  const start = Date.UTC(y, m - 1, 1);
  const end = Date.UTC(y, m, 1);
  return tx(() => {
    const pool = count(
      "SELECT COALESCE(SUM(gross_cents),0) FROM ledger WHERE kind='pool' AND creator_id IS NULL AND ts >= ? AND ts < ?",
      start, end
    );
    const minutes = all<{ creator_id: string; mins: number }>(
      `SELECT s.creator_id AS creator_id, COALESCE(SUM(w.position_s),0)/60 AS mins
       FROM watch_progress w JOIN series s ON s.id = w.series_id
       WHERE w.updated_at >= ? AND w.updated_at < ? AND s.creator_id IS NOT NULL
       GROUP BY s.creator_id`, start, end
    );
    const totalMins = minutes.reduce((a, r) => a + Number(r.mins || 0), 0) || 1;
    const created: string[] = [];
    for (const row of minutes) {
      const share = Number(row.mins || 0) / totalMins;
      const gross = Math.round(pool * share);
      const bps = count("SELECT share_bps FROM creators WHERE id = ?", row.creator_id) || 7000;
      const net = Math.round((gross * bps) / 10000);
      if (net <= 0) continue;
      ledgerEntry({
        creatorId: row.creator_id, seriesId: null, orderId: null, kind: "share",
        grossCents: gross, shareBps: bps, netCents: net, note: `VIP pool ${period} (${(share * 100).toFixed(1)}% of watch time)`,
        ts: end - 1,
      });
      created.push(createPayout({
        creatorId: row.creator_id, period, grossCents: gross, netCents: net,
        status: "scheduled", scheduledAt: end + 5 * 86400_000, note: `Auto-settled by ${operatorId}`,
      }));
    }
    return { poolCents: pool, payouts: created.length };
  });
}

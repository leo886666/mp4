import { all, count, get, insert, now, run } from "../db";

/**
 * Event ingestion + the queries behind the ops console.
 *
 * Raw events land in `events`; `daily_stats` is the rollup the charts read so
 * a 90-day dashboard is three-digit rows instead of millions.
 */

export type EventName =
  | "install" | "sign_up" | "session_start" | "play_start" | "play_complete"
  | "paywall_view" | "checkout_started" | "purchase" | "purchase_failed"
  | "favorite" | "share" | "comment" | "renew";

export function track(name: EventName | string, opts: {
  userId?: string | null; seriesId?: string | null; episodeId?: string | null;
  value?: number; props?: Record<string, unknown>; ts?: number;
} = {}) {
  insert("events", {
    ts: opts.ts ?? now(),
    name,
    user_id: opts.userId ?? null,
    series_id: opts.seriesId ?? null,
    episode_id: opts.episodeId ?? null,
    value: opts.value ?? 0,
    props: JSON.stringify(opts.props ?? {}),
  });
}

const DAY = 86400_000;
export const dayKey = (ts: number) => new Date(ts).toISOString().slice(0, 10);

/* -------------------------------- rollups --------------------------------- */

export function rollupDay(date: string) {
  const start = Date.parse(`${date}T00:00:00Z`);
  const end = start + DAY;
  const dau = count("SELECT COUNT(DISTINCT user_id) FROM events WHERE ts >= ? AND ts < ? AND user_id IS NOT NULL", start, end);
  const newUsers = count("SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?", start, end);
  const installs = count("SELECT COUNT(*) FROM events WHERE name='install' AND ts >= ? AND ts < ?", start, end);
  const revenue = count("SELECT COALESCE(SUM(amount_cents - discount_cents),0) FROM orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?", start, end);
  const orders = count("SELECT COUNT(*) FROM orders WHERE status='paid' AND paid_at >= ? AND paid_at < ?", start, end);
  const minutes = Math.round(count("SELECT COALESCE(SUM(value),0) FROM events WHERE name='play_complete' AND ts >= ? AND ts < ?", start, end) / 60);
  const paywall = count("SELECT COUNT(*) FROM events WHERE name='paywall_view' AND ts >= ? AND ts < ?", start, end);
  const purchases = count("SELECT COUNT(*) FROM events WHERE name='purchase' AND ts >= ? AND ts < ?", start, end);
  run(
    `INSERT INTO daily_stats(date, dau, new_users, installs, revenue_cents, orders, watch_minutes, paywall_views, purchases)
     VALUES(?,?,?,?,?,?,?,?,?)
     ON CONFLICT(date) DO UPDATE SET
       dau=excluded.dau, new_users=excluded.new_users, installs=excluded.installs,
       revenue_cents=excluded.revenue_cents, orders=excluded.orders,
       watch_minutes=excluded.watch_minutes, paywall_views=excluded.paywall_views, purchases=excluded.purchases`,
    date, dau, newUsers, installs, revenue, orders, minutes, paywall, purchases
  );
}

export function rollupRecent(days = 3) {
  for (let i = 0; i < days; i++) rollupDay(dayKey(now() - i * DAY));
}

/* --------------------------------- console -------------------------------- */

export interface DailyRow {
  date: string; dau: number; new_users: number; installs: number;
  revenue_cents: number; orders: number; watch_minutes: number;
  paywall_views: number; purchases: number;
}

export const dailySeries = (days = 90) =>
  all<DailyRow>("SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?", days).reverse();

export function kpis() {
  const series = dailySeries(61);
  const today = series[series.length - 1];
  // the current day is still filling up — headline DAU uses the last complete day
  const last = series.length > 1 ? series[series.length - 2] : today;
  const win30 = series.slice(-30);
  const prev30 = series.slice(-60, -30);
  const sum = (rows: DailyRow[], k: keyof DailyRow) => rows.reduce((a, r) => a + Number(r[k] || 0), 0);

  const revenue30 = sum(win30, "revenue_cents");
  const revenuePrev = sum(prev30, "revenue_cents");
  const orders30 = sum(win30, "orders");
  const activeUsers = count("SELECT COUNT(*) FROM users WHERE last_seen_at > ?", now() - 30 * DAY);
  const payingUsers = count("SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid' AND paid_at > ?", now() - 30 * DAY);
  const paymentsTotal = count("SELECT COUNT(*) FROM payments WHERE created_at > ?", now() - 30 * DAY);
  const paymentsOk = count("SELECT COUNT(*) FROM payments WHERE status='succeeded' AND created_at > ?", now() - 30 * DAY);
  const refunds = count("SELECT COUNT(*) FROM refunds WHERE created_at > ?", now() - 30 * DAY);

  return {
    dau: last?.dau ?? 0,
    dauToday: today?.dau ?? 0,
    dauDate: last?.date ?? "",
    dauDelta: pct(series[series.length - 9]?.dau ?? 0, last?.dau ?? 0),
    mau: count("SELECT COUNT(*) FROM users WHERE last_seen_at > ?", now() - 30 * DAY),
    newUsers30: sum(win30, "new_users"),
    newUsersDelta: pct(sum(prev30, "new_users"), sum(win30, "new_users")),
    revenue30Cents: revenue30,
    revenueDelta: pct(revenuePrev, revenue30),
    orders30,
    payingRate: activeUsers ? Math.round((payingUsers / activeUsers) * 1000) / 10 : 0,
    arppuCents: payingUsers ? Math.round(revenue30 / payingUsers) : 0,
    paymentSuccess: paymentsTotal ? Math.round((paymentsOk / paymentsTotal) * 1000) / 10 : 100,
    refundRate: orders30 ? Math.round((refunds / orders30) * 1000) / 10 : 0,
    vipUsers: count("SELECT COUNT(*) FROM users WHERE vip_until > ?", now()),
    watchMinutes30: sum(win30, "watch_minutes"),
  };
}

export function pct(prev: number, curr: number) {
  if (!prev) return 0;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

export function funnel(days = 90) {
  const since = now() - days * DAY;
  const distinct = (name: string) =>
    count("SELECT COUNT(DISTINCT user_id) FROM events WHERE name = ? AND ts > ? AND user_id IS NOT NULL", name, since);
  const signups = count("SELECT COUNT(*) FROM users WHERE created_at > ?", since);
  return [
    { stage: "Install", value: Math.max(distinct("install"), signups) },
    { stage: "Sign up", value: signups },
    { stage: "Watch EP1", value: distinct("play_start") },
    { stage: "Hit paywall", value: distinct("paywall_view") },
    { stage: "Purchase", value: count("SELECT COUNT(DISTINCT user_id) FROM orders WHERE status='paid' AND paid_at > ?", since) },
    {
      stage: "Renew",
      value: count(
        `SELECT COUNT(*) FROM (
           SELECT user_id FROM orders WHERE status='paid' AND kind='subscription' AND paid_at > ?
           GROUP BY user_id HAVING COUNT(*) > 1)`,
        since
      ),
    },
  ];
}

export function planMix() {
  const rows = all<{ plan_id: string; name: string; n: number; revenue: number }>(
    `SELECT o.plan_id AS plan_id, p.name AS name, COUNT(*) AS n, SUM(o.amount_cents - o.discount_cents) AS revenue
     FROM orders o JOIN plans p ON p.id = o.plan_id
     WHERE o.status='paid' AND o.kind='subscription' GROUP BY o.plan_id ORDER BY revenue DESC`
  );
  const total = rows.reduce((a, r) => a + Number(r.n), 0) || 1;
  return rows.map((r) => ({
    id: r.plan_id,
    name: r.name,
    share: Math.round((Number(r.n) / total) * 100),
    revenueCents: Number(r.revenue),
    orders: Number(r.n),
  }));
}

export function paymentMethods() {
  return all<{ method: string; n: number; ok: number }>(
    `SELECT COALESCE(method,'card') AS method, COUNT(*) AS n,
            SUM(CASE WHEN status='succeeded' THEN 1 ELSE 0 END) AS ok
     FROM payments GROUP BY method ORDER BY n DESC`
  ).map((r) => ({
    name: r.method,
    share: Number(r.n),
    success: Number(r.n) ? Math.round((Number(r.ok) / Number(r.n)) * 1000) / 10 : 0,
  }));
}

export function geoBreakdown() {
  const rows = all<{ country: string; users: number; revenue: number }>(
    `SELECT COALESCE(u.country,'Other') AS country, COUNT(DISTINCT u.id) AS users,
            COALESCE(SUM(CASE WHEN o.status='paid' THEN o.amount_cents - o.discount_cents ELSE 0 END),0) AS revenue
     FROM users u LEFT JOIN orders o ON o.user_id = u.id
     GROUP BY u.country ORDER BY revenue DESC LIMIT 8`
  );
  const totalUsers = rows.reduce((a, r) => a + Number(r.users), 0) || 1;
  return rows.map((r) => ({
    country: r.country,
    users: Math.round((Number(r.users) / totalUsers) * 100),
    userCount: Number(r.users),
    revenueCents: Number(r.revenue),
    arpuCents: Number(r.users) ? Math.round(Number(r.revenue) / Number(r.users)) : 0,
  }));
}

/** Real signup cohorts: retention = did the user emit any event on day N. */
export function cohorts(weeks = 8) {
  const out: { week: string; size: number; d1: number | null; d3: number | null; d7: number | null; d14: number | null; d30: number | null }[] = [];
  const monday = (ts: number) => {
    const d = new Date(ts);
    const day = (d.getUTCDay() + 6) % 7;
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day);
  };
  let start = monday(now()) - (weeks - 1) * 7 * DAY;
  for (let i = 0; i < weeks; i++) {
    const from = start + i * 7 * DAY;
    const to = from + 7 * DAY;
    const size = count("SELECT COUNT(*) FROM users WHERE created_at >= ? AND created_at < ?", from, to);
    const retained = (n: number) => {
      // only report a window every member of the cohort has fully lived through
      if (to + (n + 1) * DAY > now()) return null;
      return count(
        `SELECT COUNT(DISTINCT u.id) FROM users u
         WHERE u.created_at >= ? AND u.created_at < ?
           AND EXISTS (SELECT 1 FROM events e WHERE e.user_id = u.id AND e.ts >= u.created_at + ? AND e.ts < u.created_at + ?)`,
        from, to, n * DAY, (n + 1) * DAY
      );
    };
    const rate = (v: number | null) => (v === null || !size ? null : Math.round((v / size) * 1000) / 10);
    out.push({
      week: new Date(from).toISOString().slice(5, 10),
      size,
      d1: rate(retained(1)),
      d3: rate(retained(3)),
      d7: rate(retained(7)),
      d14: rate(retained(14)),
      d30: rate(retained(30)),
    });
  }
  return out;
}

export function seriesOps(limit = 20) {
  return all(
    `SELECT s.id, s.title, s.status, s.views, s.rating, s.episode_count,
            (SELECT COUNT(*) FROM events e WHERE e.series_id = s.id AND e.name='play_start' AND e.ts > ${now() - 7 * DAY}) AS views7d,
            (SELECT COUNT(*) FROM events e WHERE e.series_id = s.id AND e.name='paywall_view' AND e.ts > ${now() - 30 * DAY}) AS paywalls,
            (SELECT COALESCE(SUM(l.gross_cents),0) FROM ledger l WHERE l.series_id = s.id AND l.ts > ${now() - 30 * DAY}) AS revenue30,
            (SELECT COUNT(*) FROM reports r WHERE r.target_type='series' AND r.target_id = s.id AND r.status='open') AS reports,
            (SELECT COUNT(*) FROM orders o WHERE o.ref_id = s.id AND o.status='paid') AS unlocks
     FROM series s ORDER BY s.views DESC LIMIT ?`,
    limit
  );
}

export function campaignRows() {
  return all(
    `SELECT c.*,
            (SELECT COUNT(*) FROM users u WHERE u.campaign_id = c.id) AS users,
            (SELECT COALESCE(SUM(o.amount_cents - o.discount_cents),0) FROM orders o
              JOIN users u2 ON u2.id = o.user_id WHERE u2.campaign_id = c.id AND o.status='paid') AS revenue_cents,
            (SELECT COUNT(DISTINCT o2.user_id) FROM orders o2 JOIN users u3 ON u3.id = o2.user_id
              WHERE u3.campaign_id = c.id AND o2.status='paid') AS payers
     FROM campaigns c ORDER BY c.spend_cents DESC`
  );
}

export function overviewCounts() {
  return {
    users: count("SELECT COUNT(*) FROM users"),
    series: count("SELECT COUNT(*) FROM series WHERE status='published'"),
    episodes: count("SELECT COUNT(*) FROM episodes"),
    pendingReviews: count("SELECT COUNT(*) FROM review_items WHERE status='pending'"),
    openReports: count("SELECT COUNT(*) FROM reports WHERE status='open'"),
    creators: count("SELECT COUNT(*) FROM creators"),
    mediaReady: count("SELECT COUNT(*) FROM media_assets WHERE status='ready'"),
    mediaPending: count("SELECT COUNT(*) FROM media_assets WHERE status IN ('queued','processing')"),
  };
}

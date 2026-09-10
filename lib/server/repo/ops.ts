import { all, count, get, insert, json, now, run, update } from "../db";
import { newId } from "../ids";

/* ------------------------------ review queue ------------------------------ */

export interface ReviewRow {
  id: string; target_type: "series" | "episode" | "cover"; target_id: string;
  series_id: string | null; title: string; kind: string;
  submitted_by: string | null; submitter_name: string | null; note: string | null;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null; decided_at: number | null; decision_note: string | null; created_at: number;
}

export function submitForReview(input: {
  targetType: ReviewRow["target_type"]; targetId: string; seriesId?: string | null;
  title: string; kind: string; submittedBy: string; submitterName: string; note?: string;
}) {
  const open = get<{ id: string }>(
    "SELECT id FROM review_items WHERE target_type=? AND target_id=? AND status='pending'",
    input.targetType, input.targetId
  );
  if (open) return open.id;
  const id = newId("rev");
  insert("review_items", {
    id,
    target_type: input.targetType,
    target_id: input.targetId,
    series_id: input.seriesId ?? null,
    title: input.title,
    kind: input.kind,
    submitted_by: input.submittedBy,
    submitter_name: input.submitterName,
    note: input.note ?? null,
    status: "pending",
    created_at: now(),
  });
  return id;
}

export function listReviews(q: { status?: string; limit: number; offset: number }) {
  const where = q.status ? "WHERE status = ?" : "";
  const params: any[] = q.status ? [q.status] : [];
  return {
    rows: all<ReviewRow>(`SELECT * FROM review_items ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, ...params, q.limit, q.offset),
    total: count(`SELECT COUNT(*) FROM review_items ${where}`, ...params),
  };
}

export const getReview = (id: string) => get<ReviewRow>("SELECT * FROM review_items WHERE id = ?", id);

export function decideReview(id: string, decision: "approved" | "rejected", deciderId: string, note?: string) {
  update("review_items", id, { status: decision, decided_by: deciderId, decided_at: now(), decision_note: note ?? null });
  return getReview(id);
}

export const pendingReviewCount = () => count("SELECT COUNT(*) FROM review_items WHERE status='pending'");

/* -------------------------------- creators -------------------------------- */

export interface CreatorRow {
  id: string; user_id: string | null; name: string; initials: string; role: string;
  followers: number; share_bps: number; status: string; balance_cents: number; created_at: number;
}

export const getCreator = (id: string) => get<CreatorRow>("SELECT * FROM creators WHERE id = ?", id);
export const creatorForUser = (userId: string) => get<CreatorRow>("SELECT * FROM creators WHERE user_id = ?", userId);

export function createCreator(input: { name: string; userId?: string | null; role?: string; shareBps?: number; id?: string; followers?: number }) {
  const id = input.id ?? newId("crt");
  insert("creators", {
    id,
    user_id: input.userId ?? null,
    name: input.name,
    initials: input.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    role: input.role ?? "Creator",
    followers: input.followers ?? 0,
    share_bps: input.shareBps ?? 7000,
    status: "active",
    balance_cents: 0,
    created_at: now(),
  });
  return getCreator(id)!;
}

export function listCreators(limit = 50, offset = 0) {
  return {
    rows: all<CreatorRow & { series_count: number }>(
      `SELECT c.*, (SELECT COUNT(*) FROM series s WHERE s.creator_id = c.id) AS series_count
       FROM creators c ORDER BY c.followers DESC LIMIT ? OFFSET ?`, limit, offset
    ),
    total: count("SELECT COUNT(*) FROM creators"),
  };
}

/* -------------------------------- campaigns ------------------------------- */

export interface CampaignRow {
  id: string; channel: string; name: string; spend_cents: number; installs: number;
  status: string; utm: string | null; started_at: number | null; ended_at: number | null; created_at: number;
}

export function createCampaign(input: { channel: string; name: string; spendCents?: number; installs?: number; status?: string; utm?: string; id?: string; startedAt?: number }) {
  const id = input.id ?? newId("cmp");
  insert("campaigns", {
    id,
    channel: input.channel,
    name: input.name,
    spend_cents: input.spendCents ?? 0,
    installs: input.installs ?? 0,
    status: input.status ?? "running",
    utm: input.utm ?? null,
    started_at: input.startedAt ?? now(),
    ended_at: null,
    created_at: now(),
  });
  return get<CampaignRow>("SELECT * FROM campaigns WHERE id = ?", id)!;
}

export const patchCampaign = (id: string, patch: Record<string, any>) => {
  update("campaigns", id, patch);
  return get<CampaignRow>("SELECT * FROM campaigns WHERE id = ?", id);
};

export const listCampaigns = () => all<CampaignRow>("SELECT * FROM campaigns ORDER BY spend_cents DESC");

/* --------------------------------- settings ------------------------------- */

export const SETTING_DEFAULTS: Record<string, any> = {
  "site.name": "VESPER",
  "site.tagline": "Stories that fit your night.",
  "site.registrationOpen": true,
  "site.maintenance": false,
  "catalog.freeEpisodesDefault": 3,
  "catalog.autoPublishOnApprove": true,
  "pay.gateway": "mock",
  "pay.currency": "USD",
  "pay.ppeDefaultCents": 99,
  "creator.shareBps": 7000,
  "creator.payoutDay": 5,
  "creator.minPayoutCents": 5000,
  "moderation.autoQueueNewSeries": true,
  "moderation.commentFilter": true,
  "player.preloadNext": true,
  "player.danmakuEnabled": true,
};

export function getSetting<T = any>(key: string): T {
  const row = get<{ value: string }>("SELECT value FROM settings WHERE key = ?", key);
  if (!row) return SETTING_DEFAULTS[key] as T;
  return json<T>(row.value, SETTING_DEFAULTS[key]);
}

export function setSetting(key: string, value: unknown, updatedBy?: string) {
  run(
    `INSERT INTO settings(key, value, updated_at, updated_by) VALUES(?,?,?,?)
     ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at, updated_by=excluded.updated_by`,
    key, JSON.stringify(value), now(), updatedBy ?? null
  );
}

export function allSettings(): Record<string, any> {
  const rows = all<{ key: string; value: string }>("SELECT key, value FROM settings");
  const out: Record<string, any> = { ...SETTING_DEFAULTS };
  for (const r of rows) out[r.key] = json(r.value, out[r.key]);
  return out;
}

/* --------------------------- home curation (ops) -------------------------- */

export function upsertRail(input: { id?: string; title: string; subtitle?: string; kind: string; param?: string; ids?: string[]; sort?: number; active?: boolean }) {
  const id = input.id ?? newId("rail");
  run(
    `INSERT INTO rails(id, title, subtitle, kind, param, ids, sort, active) VALUES(?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, kind=excluded.kind,
       param=excluded.param, ids=excluded.ids, sort=excluded.sort, active=excluded.active`,
    id, input.title, input.subtitle ?? null, input.kind, input.param ?? null,
    JSON.stringify(input.ids ?? []), input.sort ?? 0, input.active === false ? 0 : 1
  );
  return id;
}

export function upsertBanner(input: { id?: string; title: string; subtitle?: string; seriesId?: string | null; imageUrl: string; link?: string; sort?: number; active?: boolean }) {
  const id = input.id ?? newId("ban");
  run(
    `INSERT INTO banners(id, title, subtitle, series_id, image_url, link, sort, active, created_at) VALUES(?,?,?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET title=excluded.title, subtitle=excluded.subtitle, series_id=excluded.series_id,
       image_url=excluded.image_url, link=excluded.link, sort=excluded.sort, active=excluded.active`,
    id, input.title, input.subtitle ?? null, input.seriesId ?? null, input.imageUrl,
    input.link ?? null, input.sort ?? 0, input.active === false ? 0 : 1, now()
  );
  return id;
}

export const listRailsAdmin = () => all("SELECT * FROM rails ORDER BY sort ASC");
export const listBannersAdmin = () => all("SELECT * FROM banners ORDER BY sort ASC");
export const deleteRail = (id: string) => run("DELETE FROM rails WHERE id = ?", id);
export const deleteBanner = (id: string) => run("DELETE FROM banners WHERE id = ?", id);

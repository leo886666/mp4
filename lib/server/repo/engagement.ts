import { all, count, get, insert, now, run } from "../db";
import { newId } from "../ids";

/* -------------------------------- progress -------------------------------- */

export interface ProgressRow {
  user_id: string; episode_id: string; series_id: string;
  position_s: number; duration_s: number; completed: number; updated_at: number;
}

export function saveProgress(input: {
  userId: string; episodeId: string; seriesId: string;
  positionS: number; durationS: number; completed?: boolean;
}) {
  run(
    `INSERT INTO watch_progress(user_id, episode_id, series_id, position_s, duration_s, completed, updated_at)
     VALUES(?,?,?,?,?,?,?)
     ON CONFLICT(user_id, episode_id) DO UPDATE SET
       position_s = excluded.position_s,
       duration_s = MAX(watch_progress.duration_s, excluded.duration_s),
       completed  = MAX(watch_progress.completed, excluded.completed),
       updated_at = excluded.updated_at`,
    input.userId, input.episodeId, input.seriesId,
    Math.max(0, input.positionS), Math.max(0, input.durationS),
    input.completed ? 1 : 0, now()
  );
}

export const progressFor = (userId: string, episodeId: string) =>
  get<ProgressRow>("SELECT * FROM watch_progress WHERE user_id = ? AND episode_id = ?", userId, episodeId);

export const progressForSeries = (userId: string, seriesId: string) =>
  all<ProgressRow>("SELECT * FROM watch_progress WHERE user_id = ? AND series_id = ?", userId, seriesId);

/** Continue watching: latest unfinished episode per series. */
export function continueWatching(userId: string, limit = 12) {
  return all(
    `SELECT w.*, s.title AS series_title, s.cover_url, e.n AS episode_n, e.title AS episode_title
     FROM watch_progress w
     JOIN series s ON s.id = w.series_id
     JOIN episodes e ON e.id = w.episode_id
     WHERE w.user_id = ?
       AND w.updated_at = (SELECT MAX(w2.updated_at) FROM watch_progress w2 WHERE w2.user_id = w.user_id AND w2.series_id = w.series_id)
     ORDER BY w.updated_at DESC LIMIT ?`,
    userId, limit
  );
}

export function historyFor(userId: string, limit: number, offset: number) {
  const rows = all(
    `SELECT w.*, s.title AS series_title, s.cover_url, s.episode_count, e.n AS episode_n, e.title AS episode_title
     FROM watch_progress w
     JOIN series s ON s.id = w.series_id
     JOIN episodes e ON e.id = w.episode_id
     WHERE w.user_id = ? ORDER BY w.updated_at DESC LIMIT ? OFFSET ?`,
    userId, limit, offset
  );
  return { rows, total: count("SELECT COUNT(*) FROM watch_progress WHERE user_id = ?", userId) };
}

export const clearHistory = (userId: string) => run("DELETE FROM watch_progress WHERE user_id = ?", userId);
export const removeHistory = (userId: string, episodeId: string) =>
  run("DELETE FROM watch_progress WHERE user_id = ? AND episode_id = ?", userId, episodeId);

/* -------------------------------- favorites ------------------------------- */

export function toggleFavorite(userId: string, seriesId: string): boolean {
  const existing = get("SELECT series_id FROM favorites WHERE user_id = ? AND series_id = ?", userId, seriesId);
  if (existing) {
    run("DELETE FROM favorites WHERE user_id = ? AND series_id = ?", userId, seriesId);
    run("UPDATE series SET favorites = MAX(0, favorites - 1) WHERE id = ?", seriesId);
    return false;
  }
  insert("favorites", { user_id: userId, series_id: seriesId, created_at: now() });
  run("UPDATE series SET favorites = favorites + 1 WHERE id = ?", seriesId);
  return true;
}

export const isFavorite = (userId: string, seriesId: string) =>
  !!get("SELECT series_id FROM favorites WHERE user_id = ? AND series_id = ?", userId, seriesId);

export function favoritesFor(userId: string, limit = 60, offset = 0) {
  const rows = all(
    `SELECT f.created_at, s.* FROM favorites f JOIN series s ON s.id = f.series_id
     WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
    userId, limit, offset
  );
  return { rows, total: count("SELECT COUNT(*) FROM favorites WHERE user_id = ?", userId) };
}

/* ---------------------------------- likes --------------------------------- */

export function toggleLike(userId: string, targetType: "series" | "episode" | "comment", targetId: string): boolean {
  const existing = get("SELECT target_id FROM likes WHERE user_id=? AND target_type=? AND target_id=?", userId, targetType, targetId);
  const table = targetType === "series" ? "series" : targetType === "episode" ? "episodes" : "comments";
  if (existing) {
    run("DELETE FROM likes WHERE user_id=? AND target_type=? AND target_id=?", userId, targetType, targetId);
    run(`UPDATE ${table} SET likes = MAX(0, likes - 1) WHERE id = ?`, targetId);
    return false;
  }
  insert("likes", { user_id: userId, target_type: targetType, target_id: targetId, created_at: now() });
  run(`UPDATE ${table} SET likes = likes + 1 WHERE id = ?`, targetId);
  return true;
}

/* -------------------------------- comments -------------------------------- */

export function addComment(input: { userId: string; seriesId: string; episodeId?: string | null; body: string; parentId?: string | null }) {
  const id = newId("cmt");
  insert("comments", {
    id,
    user_id: input.userId,
    series_id: input.seriesId,
    episode_id: input.episodeId ?? null,
    parent_id: input.parentId ?? null,
    body: input.body,
    likes: 0,
    status: "visible",
    created_at: now(),
  });
  return get("SELECT c.*, u.name AS user_name, u.initials FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?", id);
}

export function listComments(seriesId: string, limit = 30, offset = 0) {
  const rows = all(
    `SELECT c.*, u.name AS user_name, u.initials, u.vip_until FROM comments c
     JOIN users u ON u.id = c.user_id
     WHERE c.series_id = ? AND c.status = 'visible'
     ORDER BY c.likes DESC, c.created_at DESC LIMIT ? OFFSET ?`,
    seriesId, limit, offset
  );
  return { rows, total: count("SELECT COUNT(*) FROM comments WHERE series_id = ? AND status='visible'", seriesId) };
}

export const hideComment = (id: string, status: "hidden" | "removed" | "visible") =>
  run("UPDATE comments SET status = ? WHERE id = ?", status, id);

export const listAllComments = (q: { status?: string; limit: number; offset: number }) => {
  const where = q.status ? "WHERE c.status = ?" : "";
  const params: any[] = q.status ? [q.status] : [];
  return {
    rows: all(
      `SELECT c.*, u.name AS user_name, s.title AS series_title FROM comments c
       JOIN users u ON u.id = c.user_id JOIN series s ON s.id = c.series_id
       ${where} ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      ...params, q.limit, q.offset
    ),
    total: count(`SELECT COUNT(*) FROM comments c ${where}`, ...params),
  };
};

/* --------------------------------- danmaku -------------------------------- */

export function addDanmaku(input: { userId: string | null; episodeId: string; tMs: number; body: string; color?: string }) {
  const id = newId("dmk");
  insert("danmaku", {
    id,
    user_id: input.userId,
    episode_id: input.episodeId,
    t_ms: Math.max(0, Math.round(input.tMs)),
    body: input.body.slice(0, 80),
    color: input.color ?? "#ffffff",
    status: "visible",
    created_at: now(),
  });
  return id;
}

export const danmakuFor = (episodeId: string, limit = 400) =>
  all<{ id: string; t_ms: number; body: string; color: string }>(
    "SELECT id, t_ms, body, color FROM danmaku WHERE episode_id = ? AND status='visible' ORDER BY t_ms ASC LIMIT ?",
    episodeId, limit
  );

/* --------------------------------- reports -------------------------------- */

export function createReport(input: { reporterId: string | null; targetType: string; targetId: string; reason: string; detail?: string }) {
  const id = newId("rep");
  insert("reports", {
    id,
    reporter_id: input.reporterId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason,
    detail: input.detail ?? null,
    status: "open",
    created_at: now(),
  });
  return id;
}

export function listReports(q: { status?: string; limit: number; offset: number }) {
  const where = q.status ? "WHERE r.status = ?" : "";
  const params: any[] = q.status ? [q.status] : [];
  return {
    rows: all(
      `SELECT r.*, u.name AS reporter_name, s.title AS series_title FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_id
       LEFT JOIN series s ON s.id = r.target_id
       ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,
      ...params, q.limit, q.offset
    ),
    total: count(`SELECT COUNT(*) FROM reports r ${where}`, ...params),
  };
}

export function resolveReport(id: string, status: "resolved" | "dismissed", handledBy: string, resolution: string) {
  run("UPDATE reports SET status=?, handled_by=?, handled_at=?, resolution=? WHERE id=?", status, handledBy, now(), resolution, id);
  return get("SELECT * FROM reports WHERE id = ?", id);
}

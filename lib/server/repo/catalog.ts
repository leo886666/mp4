import { all, count, get, insert, json, now, run, update } from "../db";
import { newId, hash32 } from "../ids";
import { placeholderCover, placeholderHero } from "../placeholders";

/* ---------------------------------- rows ---------------------------------- */

export interface SeriesRow {
  id: string;
  title: string;
  genre_id: string | null;
  creator_id: string | null;
  synopsis: string;
  cover_url: string;
  hero_url: string | null;
  tags: string;
  status: "draft" | "review" | "published" | "rejected" | "offline";
  ongoing: number;
  updated_label: string | null;
  rating: number;
  views: number;
  likes: number;
  favorites: number;
  episode_count: number;
  free_episodes: number;
  monetization: "free" | "vip" | "ppe";
  ppe_price_cents: number;
  is_new: number;
  featured: number;
  review_note: string | null;
  published_at: number | null;
  created_at: number;
  updated_at: number;
  creator_name?: string;
  genre_name?: string;
}

export interface EpisodeRow {
  id: string;
  series_id: string;
  n: number;
  title: string;
  duration_s: number;
  access: "free" | "vip" | "ppe";
  price_cents: number;
  media_id: string | null;
  poster_url: string | null;
  status: string;
  views: number;
  likes: number;
  publish_at: number | null;
  created_at: number;
  updated_at: number;
}

/* ---------------------------------- DTOs ---------------------------------- */

export interface SeriesDTO {
  id: string;
  title: string;
  genre: string;
  genreName: string;
  tags: string[];
  cover: string;
  hero?: string;
  rating: number;
  views: number;
  likes: number;
  favorites: number;
  episodes: number;
  freeEpisodes: number;
  status: "Ongoing" | "Completed";
  publishState: SeriesRow["status"];
  updatedLabel: string;
  synopsis: string;
  creator: string;
  creatorName: string;
  isNew?: boolean;
  featured?: boolean;
  monetization: "free" | "vip" | "ppe";
  ppePrice: number;
  updatedAt: number;
  reviewNote?: string | null;
}

export function toSeries(r: SeriesRow): SeriesDTO {
  return {
    id: r.id,
    title: r.title,
    genre: r.genre_id ?? "romance",
    genreName: r.genre_name ?? genreName(r.genre_id ?? ""),
    tags: json<string[]>(r.tags, []),
    cover: r.cover_url || placeholderCover(r.id),
    hero: r.hero_url || undefined,
    rating: r.rating,
    views: r.views,
    likes: r.likes,
    favorites: r.favorites,
    episodes: r.episode_count,
    freeEpisodes: r.free_episodes,
    status: r.ongoing ? "Ongoing" : "Completed",
    publishState: r.status,
    updatedLabel: r.updated_label ?? "Updated weekly",
    synopsis: r.synopsis,
    creator: r.creator_id ?? "",
    creatorName: r.creator_name ?? "",
    isNew: !!r.is_new,
    featured: !!r.featured,
    monetization: r.monetization,
    ppePrice: r.ppe_price_cents / 100,
    updatedAt: r.updated_at,
    reviewNote: r.review_note,
  };
}

export interface EpisodeDTO {
  id: string;
  n: number;
  title: string;
  duration: string;
  durationS: number;
  access: "free" | "vip" | "ppe";
  price: number;
  hasMedia: boolean;
  mediaStatus?: string;
  poster?: string;
  views: number;
  status: string;
}

export function fmtDuration(s: number): string {
  const t = Math.max(0, Math.round(s));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
}

export function toEpisode(r: EpisodeRow & { media_status?: string | null }): EpisodeDTO {
  return {
    id: r.id,
    n: r.n,
    title: r.title,
    duration: fmtDuration(r.duration_s),
    durationS: r.duration_s,
    access: r.access,
    price: r.price_cents / 100,
    hasMedia: !!r.media_id,
    mediaStatus: r.media_status ?? undefined,
    poster: r.poster_url ?? undefined,
    views: r.views,
    status: r.status,
  };
}

/* --------------------------------- genres --------------------------------- */

export interface GenreRow { id: string; name: string; sort: number }

let genreCache: GenreRow[] | null = null;
export function genres(): GenreRow[] {
  if (!genreCache) genreCache = all<GenreRow>("SELECT * FROM genres ORDER BY sort, name");
  return genreCache;
}
export function invalidateGenres() { genreCache = null; }
export function genreName(id: string): string {
  return genres().find((g) => g.id === id)?.name ?? id;
}

/* --------------------------------- series --------------------------------- */

const SELECT_SERIES = `
  SELECT s.*, c.name AS creator_name, g.name AS genre_name
  FROM series s
  LEFT JOIN creators c ON c.id = s.creator_id
  LEFT JOIN genres   g ON g.id = s.genre_id`;

export function getSeries(id: string): SeriesRow | null {
  return get<SeriesRow>(`${SELECT_SERIES} WHERE s.id = ?`, id);
}

export interface SeriesQuery {
  genre?: string;
  q?: string;
  status?: string;          // publish state
  creatorId?: string;
  sort?: "trending" | "new" | "rating" | "views" | "updated" | "title";
  limit: number;
  offset: number;
  featuredOnly?: boolean;
}

const SORTS: Record<string, string> = {
  trending: "s.views DESC",
  new: "s.published_at DESC, s.created_at DESC",
  rating: "s.rating DESC",
  views: "s.views DESC",
  updated: "s.updated_at DESC",
  title: "s.title ASC",
};

export function listSeries(q: SeriesQuery) {
  const where: string[] = ["1=1"];
  const params: any[] = [];
  if (q.status) {
    where.push("s.status = ?");
    params.push(q.status);
  }
  if (q.genre && q.genre !== "all") {
    where.push("s.genre_id = ?");
    params.push(q.genre);
  }
  if (q.creatorId) {
    where.push("s.creator_id = ?");
    params.push(q.creatorId);
  }
  if (q.featuredOnly) where.push("s.featured = 1");
  if (q.q) {
    where.push("(s.title LIKE ? OR s.synopsis LIKE ? OR s.tags LIKE ?)");
    const like = `%${q.q}%`;
    params.push(like, like, like);
  }
  const w = where.join(" AND ");
  const order = SORTS[q.sort || "trending"] ?? SORTS.trending;
  const rows = all<SeriesRow>(`${SELECT_SERIES} WHERE ${w} ORDER BY ${order} LIMIT ? OFFSET ?`, ...params, q.limit, q.offset);
  const total = count(`SELECT COUNT(*) FROM series s WHERE ${w}`, ...params);
  return { rows, total };
}

export function relatedSeries(row: SeriesRow, limit = 8): SeriesRow[] {
  return all<SeriesRow>(
    `${SELECT_SERIES} WHERE s.status = 'published' AND s.id <> ? AND s.genre_id = ? ORDER BY s.views DESC LIMIT ?`,
    row.id,
    row.genre_id,
    limit
  );
}

export function seriesByIds(ids: string[]): SeriesRow[] {
  if (!ids.length) return [];
  const marks = ids.map(() => "?").join(",");
  const rows = all<SeriesRow>(`${SELECT_SERIES} WHERE s.id IN (${marks})`, ...ids);
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export function createSeries(input: {
  title: string;
  genreId: string;
  creatorId: string;
  synopsis?: string;
  tags?: string[];
  coverUrl?: string;
  heroUrl?: string | null;
  freeEpisodes?: number;
  monetization?: "free" | "vip" | "ppe";
  ppePriceCents?: number;
  status?: SeriesRow["status"];
  id?: string;
  createdAt?: number;
  rating?: number;
  views?: number;
  ongoing?: boolean;
  updatedLabel?: string;
  isNew?: boolean;
  featured?: boolean;
  publishedAt?: number | null;
}): SeriesRow {
  const id = input.id ?? newId("ser");
  const ts = input.createdAt ?? now();
  insert("series", {
    id,
    title: input.title,
    genre_id: input.genreId,
    creator_id: input.creatorId,
    synopsis: input.synopsis ?? "",
    cover_url: input.coverUrl || placeholderCover(id),
    hero_url: input.heroUrl ?? null,
    tags: JSON.stringify(input.tags ?? []),
    status: input.status ?? "draft",
    ongoing: input.ongoing === undefined ? 1 : input.ongoing ? 1 : 0,
    updated_label: input.updatedLabel ?? "Updated weekly",
    rating: input.rating ?? 8.6,
    views: input.views ?? 0,
    likes: 0,
    favorites: 0,
    episode_count: 0,
    free_episodes: input.freeEpisodes ?? 3,
    monetization: input.monetization ?? "vip",
    ppe_price_cents: input.ppePriceCents ?? 99,
    is_new: input.isNew ? 1 : 0,
    featured: input.featured ? 1 : 0,
    published_at: input.publishedAt ?? null,
    created_at: ts,
    updated_at: ts,
  });
  return getSeries(id)!;
}

export function patchSeries(id: string, patch: Record<string, any>) {
  update("series", id, { ...patch, updated_at: now() });
  return getSeries(id);
}

export function recountEpisodes(seriesId: string) {
  const n = count("SELECT COUNT(*) FROM episodes WHERE series_id = ? AND status = 'published'", seriesId);
  run("UPDATE series SET episode_count = ?, updated_at = ? WHERE id = ?", n, now(), seriesId);
  return n;
}

export function bumpViews(seriesId: string, episodeId?: string) {
  run("UPDATE series SET views = views + 1 WHERE id = ?", seriesId);
  if (episodeId) run("UPDATE episodes SET views = views + 1 WHERE id = ?", episodeId);
}

/* -------------------------------- episodes -------------------------------- */

export function listEpisodes(seriesId: string, includeDrafts = false): (EpisodeRow & { media_status: string | null })[] {
  const where = includeDrafts ? "" : "AND e.status = 'published'";
  return all(
    `SELECT e.*, m.status AS media_status FROM episodes e
     LEFT JOIN media_assets m ON m.id = e.media_id
     WHERE e.series_id = ? ${where} ORDER BY e.n ASC`,
    seriesId
  );
}

export function getEpisode(id: string): (EpisodeRow & { media_status: string | null }) | null {
  return get(
    `SELECT e.*, m.status AS media_status FROM episodes e
     LEFT JOIN media_assets m ON m.id = e.media_id WHERE e.id = ?`,
    id
  );
}

export function getEpisodeByN(seriesId: string, n: number) {
  return get<EpisodeRow>("SELECT * FROM episodes WHERE series_id = ? AND n = ?", seriesId, n);
}

export function createEpisode(input: {
  seriesId: string;
  n: number;
  title: string;
  durationS?: number;
  access?: "free" | "vip" | "ppe";
  priceCents?: number;
  mediaId?: string | null;
  posterUrl?: string | null;
  status?: string;
  id?: string;
  createdAt?: number;
}): EpisodeRow {
  const id = input.id ?? newId("epi");
  const ts = input.createdAt ?? now();
  insert("episodes", {
    id,
    series_id: input.seriesId,
    n: input.n,
    title: input.title,
    duration_s: input.durationS ?? 0,
    access: input.access ?? "vip",
    price_cents: input.priceCents ?? 0,
    media_id: input.mediaId ?? null,
    poster_url: input.posterUrl ?? null,
    status: input.status ?? "published",
    views: 0,
    likes: 0,
    publish_at: ts,
    created_at: ts,
    updated_at: ts,
  });
  return get<EpisodeRow>("SELECT * FROM episodes WHERE id = ?", id)!;
}

export function patchEpisode(id: string, patch: Record<string, any>) {
  update("episodes", id, { ...patch, updated_at: now() });
  return getEpisode(id);
}

export function deleteEpisode(id: string) {
  run("DELETE FROM episodes WHERE id = ?", id);
}

export function nextEpisodeNumber(seriesId: string): number {
  return count("SELECT COALESCE(MAX(n),0) FROM episodes WHERE series_id = ?", seriesId) + 1;
}

/* ------------------------------ home curation ----------------------------- */

export interface RailRow { id: string; title: string; subtitle: string | null; kind: string; param: string | null; ids: string; sort: number; active: number }
export interface BannerRow { id: string; title: string; subtitle: string | null; series_id: string | null; image_url: string; link: string | null; sort: number; active: number }

export function activeBanners(): BannerRow[] {
  return all<BannerRow>("SELECT * FROM banners WHERE active = 1 ORDER BY sort ASC");
}

export function activeRails(): RailRow[] {
  return all<RailRow>("SELECT * FROM rails WHERE active = 1 ORDER BY sort ASC");
}

export function resolveRail(rail: RailRow, limit = 12): SeriesRow[] {
  switch (rail.kind) {
    case "manual":
      return seriesByIds(json<string[]>(rail.ids, []));
    case "genre":
      return listSeries({ genre: rail.param ?? "romance", status: "published", sort: "trending", limit, offset: 0 }).rows;
    case "new":
      return listSeries({ status: "published", sort: "new", limit, offset: 0 }).rows;
    case "completed":
      return all<SeriesRow>(`${SELECT_SERIES} WHERE s.status='published' AND s.ongoing = 0 ORDER BY s.views DESC LIMIT ?`, limit);
    case "trending":
    default:
      return listSeries({ status: "published", sort: "trending", limit, offset: 0 }).rows;
  }
}

/** Stable pseudo-random pick so demo rails differ without being random per request. */
export function shuffleStable<T extends { id: string }>(rows: T[], seed: string): T[] {
  return [...rows].sort((a, b) => hash32(seed + a.id) - hash32(seed + b.id));
}

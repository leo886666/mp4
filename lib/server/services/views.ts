import { activeBanners, activeRails, getSeries, listEpisodes, listSeries, relatedSeries, resolveRail, seriesByIds } from "../repo/catalog";
import { episodeDTO, seriesDTO, seriesListDTO } from "../dto";
import { continueWatching, isFavorite, listComments, progressForSeries } from "../repo/engagement";
import { decideAccess } from "../entitlements";
import { coverOr } from "@/lib/placeholders";
import { notFound } from "../http";
import type { UserRow } from "../repo/users";

/**
 * Shared read models.
 *
 * Both the REST API (for the mobile app / third parties) and the server
 * components (for first paint) call these, so a page and its endpoint can
 * never drift apart.
 */

export function homeView(user: UserRow | null) {
  const banners = activeBanners();
  const heroById = new Map(seriesByIds(banners.map((b) => b.series_id!).filter(Boolean)).map((s) => [s.id, s]));

  return {
    hero: banners
      .map((b) => {
        const s = b.series_id ? heroById.get(b.series_id) : null;
        return {
          id: b.id,
          seriesId: b.series_id,
          title: b.title,
          subtitle: b.subtitle,
          image: b.image_url,
          link: b.link ?? (b.series_id ? `/title/${b.series_id}` : "/discover"),
          series: s ? seriesDTO(s) : null,
        };
      })
      .filter((h) => h.series),
    continueWatching: user
      ? continueWatching(user.id, 12).map((r: any) => ({
          seriesId: r.series_id,
          episodeId: r.episode_id,
          title: r.series_title,
          cover: coverOr(r.cover_url, r.series_id),
          episodeN: r.episode_n,
          episodeTitle: r.episode_title,
          positionS: r.position_s,
          durationS: r.duration_s,
          percent: r.duration_s ? Math.min(100, Math.round((r.position_s / r.duration_s) * 100)) : 0,
          updatedAt: r.updated_at,
        }))
      : [],
    top10: seriesListDTO(listSeries({ status: "published", sort: "trending", limit: 10, offset: 0 }).rows),
    fresh: seriesListDTO(listSeries({ status: "published", sort: "new", limit: 12, offset: 0 }).rows),
    ongoing: seriesListDTO(listSeries({ status: "published", sort: "updated", limit: 12, offset: 0 }).rows.filter((s) => s.ongoing)),
    rails: activeRails().map((rail) => ({
      id: rail.id,
      title: rail.title,
      subtitle: rail.subtitle,
      kind: rail.kind,
      href: rail.kind === "genre" ? `/discover?genre=${rail.param}` : "/discover",
      items: seriesListDTO(resolveRail(rail, 12)),
    })),
  };
}

export function titleView(id: string, user: UserRow | null) {
  const row = getSeries(id);
  if (!row) throw notFound("Series not found");
  const staff = user && ["reviewer", "admin", "owner"].includes(user.role);
  if (row.status !== "published" && !staff) throw notFound("Series not found");

  const progress = user ? new Map(progressForSeries(user.id, row.id).map((p) => [p.episode_id, p])) : new Map();

  return {
    series: seriesDTO(row),
    episodes: listEpisodes(row.id).map((e) => {
      const access = decideAccess(user, row, e);
      const p = progress.get(e.id);
      return {
        ...episodeDTO(e, row.cover_url),
        locked: !access.allowed,
        requires: access.requires,
        progress: p ? { positionS: p.position_s, durationS: p.duration_s, completed: !!p.completed } : null,
      };
    }),
    related: seriesListDTO(relatedSeries(row, 8)),
    comments: listComments(row.id, 8).rows.map((c: any) => ({
      id: c.id,
      body: c.body,
      likes: c.likes,
      createdAt: c.created_at,
      user: { name: c.user_name, initials: c.initials, vip: (c.vip_until ?? 0) > Date.now() },
    })),
    me: user ? { favorite: isFavorite(user.id, row.id), vip: (user.vip_until ?? 0) > Date.now() } : null,
  };
}

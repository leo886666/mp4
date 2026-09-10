import { getEpisode, getSeries, type EpisodeRow, type SeriesRow } from "./repo/catalog";
import { hasEntitlement } from "./repo/commerce";
import { isVip, type UserRow } from "./repo/users";
import { notFound, paymentRequired } from "./http";

export type AccessReason = "free" | "vip" | "purchased" | "preview" | "locked";

export interface AccessDecision {
  allowed: boolean;
  reason: AccessReason;
  /** what the client should do about it */
  requires?: "login" | "vip" | "purchase";
  priceCents?: number;
}

/**
 * The one place that decides whether bytes may flow.
 *
 * Free episodes are open to everyone (signed in or not); everything else needs
 * an active VIP window or an explicit per-episode / per-series entitlement.
 * The player never makes this call — it asks /api/episodes/[id]/play.
 */
export function decideAccess(user: UserRow | null, series: SeriesRow, episode: EpisodeRow): AccessDecision {
  const free = episode.access === "free" || episode.n <= series.free_episodes || series.monetization === "free";
  if (free) return { allowed: true, reason: "free" };

  if (!user) {
    return {
      allowed: false,
      reason: "locked",
      requires: "login",
      priceCents: episode.price_cents || series.ppe_price_cents,
    };
  }

  if (isVip(user)) return { allowed: true, reason: "vip" };

  if (hasEntitlement(user.id, "series", series.id) || hasEntitlement(user.id, "episode", episode.id)) {
    return { allowed: true, reason: "purchased" };
  }

  return {
    allowed: false,
    reason: "locked",
    requires: series.monetization === "ppe" ? "purchase" : "vip",
    priceCents: episode.price_cents || series.ppe_price_cents,
  };
}

export function loadPlayable(episodeId: string) {
  const episode = getEpisode(episodeId);
  if (!episode) throw notFound("Episode not found");
  const series = getSeries(episode.series_id);
  if (!series) throw notFound("Series not found");
  return { episode, series };
}

export function assertAccess(user: UserRow | null, series: SeriesRow, episode: EpisodeRow): AccessDecision {
  const decision = decideAccess(user, series, episode);
  if (!decision.allowed) {
    throw paymentRequired(decision.requires === "login" ? "Sign in to keep watching" : "Unlock required", {
      requires: decision.requires,
      priceCents: decision.priceCents,
      seriesId: series.id,
      episodeId: episode.id,
      monetization: series.monetization,
    });
  }
  return decision;
}

import { ok, route } from "@/lib/server/http";
import { optionalUser } from "@/lib/server/session";
import { assertAccess, decideAccess, loadPlayable } from "@/lib/server/entitlements";
import { getAsset, variantsOf } from "@/lib/server/repo/media";
import { bumpViews, getEpisodeByN, listEpisodes } from "@/lib/server/repo/catalog";
import { progressFor, danmakuFor } from "@/lib/server/repo/engagement";
import { sign } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";
import { storage } from "@/lib/server/storage";
import { track } from "@/lib/server/repo/stats";
import { posterOr } from "@/lib/placeholders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The gate in front of every byte of video.
 *
 * Returns a short-lived signed playback token; the streaming route refuses any
 * manifest or segment request without it. Locked episodes return 402 with the
 * exact unlock path (sign in / go VIP / buy this episode).
 */
export const GET = route(async (req: Request, { params }: { params: { id: string } }) => {
  const user = optionalUser("site");
  const { episode, series } = loadPlayable(params.id);

  const decision = decideAccess(user, series, episode);
  if (!decision.allowed) {
    track("paywall_view", { userId: user?.id ?? null, seriesId: series.id, episodeId: episode.id });
    assertAccess(user, series, episode); // throws 402 with details
  }

  const asset = episode.media_id ? getAsset(episode.media_id) : null;
  const token = sign({ a: asset?.id ?? "", e: episode.id, u: user?.id ?? "anon" }, env.playTokenSeconds);

  const sources: { type: string; url: string; label: string }[] = [];
  if (asset?.status === "ready") {
    if (asset.hls_key) sources.push({ type: "hls", url: `/api/stream/${asset.id}/hls/master.m3u8?t=${encodeURIComponent(token)}`, label: "Auto" });
    if (asset.mp4_key) sources.push({ type: "mp4", url: `/api/stream/${asset.id}/source.mp4?t=${encodeURIComponent(token)}`, label: "Original" });
  }

  bumpViews(series.id, episode.id);
  track("play_start", { userId: user?.id ?? null, seriesId: series.id, episodeId: episode.id });

  const all = listEpisodes(series.id);
  const next = all.find((e) => e.n === episode.n + 1) ?? null;
  const prev = all.find((e) => e.n === episode.n - 1) ?? null;
  const progress = user ? progressFor(user.id, episode.id) : null;

  return ok({
    episode: {
      id: episode.id,
      n: episode.n,
      title: episode.title,
      durationS: episode.duration_s,
      access: episode.access,
      poster: posterOr(episode.poster_url, series.cover_url, episode.id),
    },
    series: { id: series.id, title: series.title, cover: series.cover_url, episodes: series.episode_count },
    access: decision,
    media: asset
      ? {
          id: asset.id,
          status: asset.status,
          durationS: asset.duration_s,
          width: asset.width,
          height: asset.height,
          poster: asset.poster_key ? `/api/stream/${asset.id}/poster.jpg?t=${encodeURIComponent(token)}` : null,
          sprite: asset.sprite_key ? `/api/stream/${asset.id}/sprite.jpg?t=${encodeURIComponent(token)}` : null,
          variants: variantsOf(asset).map((v) => v.height),
          cdn: !!storage().publicUrl(asset.hls_key ?? ""),
        }
      : { id: null, status: "missing" },
    sources,
    token,
    next: next ? { id: next.id, n: next.n, title: next.title } : null,
    prev: prev ? { id: prev.id, n: prev.n, title: prev.title } : null,
    progress: progress ? { positionS: progress.position_s, durationS: progress.duration_s, completed: !!progress.completed } : null,
    danmaku: danmakuFor(episode.id, 300).map((d) => ({ t: d.t_ms, body: d.body, color: d.color })),
  });
});

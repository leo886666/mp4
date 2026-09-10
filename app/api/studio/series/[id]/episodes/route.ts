import { body, notFound, num, ok, oneOf, route, str } from "@/lib/server/http";
import { assertOwnsSeries, requireCreator } from "@/lib/server/services/studio";
import { createEpisode, getSeries, listEpisodes, nextEpisodeNumber, recountEpisodes } from "@/lib/server/repo/catalog";
import { episodeDTO } from "@/lib/server/dto";
import { getAsset } from "@/lib/server/repo/media";
import { episodeTitle } from "@/lib/utils";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const { user, creator } = requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);
  return ok({ episodes: listEpisodes(series.id, true).map((e) => episodeDTO(e, series.cover_url)) });
});

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const { user, creator } = requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);

  const data = await body(req);
  const n = num(data.n, "n", { optional: true, def: nextEpisodeNumber(series.id), min: 1, max: 999 });
  const mediaId = str(data.mediaId, "mediaId", { optional: true }) || null;
  if (mediaId && !getAsset(mediaId)) throw notFound("Media asset not found");

  const episode = createEpisode({
    seriesId: series.id,
    n,
    title: str(data.title, "title", { optional: true, max: 80 }) || episodeTitle(n),
    access: oneOf(data.access, "access", ["free", "vip", "ppe"] as const, n <= series.free_episodes ? "free" : series.monetization === "ppe" ? "ppe" : "vip"),
    priceCents: series.ppe_price_cents,
    mediaId,
    posterUrl: str(data.poster, "poster", { optional: true }) || series.cover_url,
    status: series.status === "published" ? "published" : "draft",
  });
  recountEpisodes(series.id);
  audit({ actorId: user.id, actorName: user.name, action: "episode.create", targetType: "episode", targetId: episode.id, detail: { seriesId: series.id, n } });
  return ok({ episode: episodeDTO(episode as any, series.cover_url) });
});

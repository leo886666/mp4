import { body, notFound, ok, oneOf, route, str } from "@/lib/server/http";
import { assertOwnsSeries, requireCreator } from "@/lib/server/services/studio";
import { deleteEpisode, getEpisode, getSeries, patchEpisode, recountEpisodes } from "@/lib/server/repo/catalog";
import { episodeDTO } from "@/lib/server/dto";
import { getAsset } from "@/lib/server/repo/media";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const episode = getEpisode(params.id);
  if (!episode) throw notFound("Episode not found");
  const series = getSeries(episode.series_id)!;
  assertOwnsSeries(creator.id, series.creator_id, user.role);

  const data = await body(req);
  const patch: Record<string, any> = {};
  if (data.title !== undefined) patch.title = str(data.title, "title", { min: 1, max: 80 });
  if (data.access !== undefined) patch.access = oneOf(data.access, "access", ["free", "vip", "ppe"] as const);
  if (data.status !== undefined) patch.status = oneOf(data.status, "status", ["draft", "review", "published", "offline"] as const);
  if (data.mediaId !== undefined) {
    const asset = data.mediaId ? getAsset(String(data.mediaId)) : null;
    if (data.mediaId && !asset) throw notFound("Media asset not found");
    patch.media_id = data.mediaId || null;
    if (asset?.duration_s) patch.duration_s = Math.round(asset.duration_s);
  }
  if (data.poster !== undefined) patch.poster_url = data.poster || series.cover_url;

  const updated = patchEpisode(episode.id, patch);
  recountEpisodes(series.id);
  audit({ actorId: user.id, actorName: user.name, action: "episode.update", targetType: "episode", targetId: episode.id, detail: patch });
  return ok({ episode: episodeDTO(updated as any, series.cover_url) });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const episode = getEpisode(params.id);
  if (!episode) throw notFound("Episode not found");
  const series = getSeries(episode.series_id)!;
  assertOwnsSeries(creator.id, series.creator_id, user.role);
  deleteEpisode(episode.id);
  recountEpisodes(series.id);
  audit({ actorId: user.id, actorName: user.name, action: "episode.delete", targetType: "episode", targetId: episode.id });
  return ok({ deleted: true });
});

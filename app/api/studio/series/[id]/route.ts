import { body, notFound, num, ok, oneOf, route, str } from "@/lib/server/http";
import { assertOwnsSeries, requireCreator } from "@/lib/server/services/studio";
import { genres, getSeries, listEpisodes, patchSeries } from "@/lib/server/repo/catalog";
import { episodeDTO, seriesDTO } from "@/lib/server/dto";
import { run } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);
  return ok({
    series: seriesDTO(series),
    episodes: listEpisodes(series.id, true).map((e) => episodeDTO(e, series.cover_url)),
  });
});

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);

  const data = await body(req);
  const patch: Record<string, any> = {};
  if (data.title !== undefined) patch.title = str(data.title, "title", { min: 2, max: 80 });
  if (data.synopsis !== undefined) patch.synopsis = str(data.synopsis, "synopsis", { optional: true, max: 1200 });
  if (data.genre !== undefined) patch.genre_id = oneOf(data.genre, "genre", genres().map((g) => g.id) as [string, ...string[]]);
  if (data.cover !== undefined && data.cover) patch.cover_url = str(data.cover, "cover", { max: 400 });
  if (data.hero !== undefined) patch.hero_url = data.hero ? str(data.hero, "hero", { max: 400 }) : null;
  if (data.tags !== undefined) patch.tags = JSON.stringify((Array.isArray(data.tags) ? data.tags : []).slice(0, 6).map((t: any) => String(t).slice(0, 24)));
  if (data.freeEpisodes !== undefined) patch.free_episodes = num(data.freeEpisodes, "freeEpisodes", { min: 0, max: 30 });
  if (data.monetization !== undefined) patch.monetization = oneOf(data.monetization, "monetization", ["free", "vip", "ppe"] as const);
  if (data.ppePrice !== undefined) patch.ppe_price_cents = Math.round(num(data.ppePrice, "ppePrice", { min: 0, max: 99 }) * 100);
  if (data.ongoing !== undefined) patch.ongoing = data.ongoing ? 1 : 0;
  if (data.updatedLabel !== undefined) patch.updated_label = str(data.updatedLabel, "updatedLabel", { optional: true, max: 40 });

  const updated = patchSeries(series.id, patch);

  // keep episode access in sync with the paywall settings
  if (patch.free_episodes !== undefined || patch.monetization !== undefined) {
    const free = patch.free_episodes ?? series.free_episodes;
    const mon = patch.monetization ?? series.monetization;
    run("UPDATE episodes SET access = CASE WHEN n <= ? THEN 'free' ELSE ? END WHERE series_id = ?", free, mon === "free" ? "free" : mon === "ppe" ? "ppe" : "vip", series.id);
  }

  audit({ actorId: user.id, actorName: user.name, action: "series.update", targetType: "series", targetId: series.id, detail: patch });
  return ok({ series: seriesDTO(updated!) });
});

export const DELETE = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);
  // published catalogue is never hard-deleted — it goes offline and keeps its history
  patchSeries(series.id, { status: series.status === "published" ? "offline" : "draft" });
  audit({ actorId: user.id, actorName: user.name, action: "series.offline", targetType: "series", targetId: series.id });
  return ok({ status: series.status === "published" ? "offline" : "draft" });
});

import { badRequest, notFound, ok, route } from "@/lib/server/http";
import { assertOwnsSeries, requireCreator } from "@/lib/server/services/studio";
import { getSeries, listEpisodes, patchSeries } from "@/lib/server/repo/catalog";
import { submitForReview } from "@/lib/server/repo/ops";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";
import { all } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Creator -> review queue. This is the hand-off the ops console picks up. */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const { user, creator } = await requireCreator();
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  assertOwnsSeries(creator.id, series.creator_id, user.role);

  const episodes = listEpisodes(series.id, true);
  if (episodes.length < 1) throw badRequest("Add at least one episode before submitting");
  if (!episodes.some((e) => e.media_id)) throw badRequest("At least one episode needs a video before submitting");

  patchSeries(series.id, { status: "review", review_note: null });
  const reviewId = submitForReview({
    targetType: "series",
    targetId: series.id,
    seriesId: series.id,
    title: `${series.title} — ${series.status === "rejected" ? "resubmission" : "new series"}`,
    kind: "New series",
    submittedBy: user.id,
    submitterName: creator.name,
    note: `${episodes.length} episodes · ${episodes.filter((e) => e.media_id).length} with video`,
  });

  for (const staff of all<{ id: string }>("SELECT id FROM users WHERE role IN ('reviewer','admin','owner')")) {
    notify({ userId: staff.id, kind: "review", title: "New submission", body: `${creator.name} submitted ${series.title}`, link: "/admin/reviews" });
  }
  audit({ actorId: user.id, actorName: user.name, action: "series.submit", targetType: "series", targetId: series.id });
  return ok({ reviewId, status: "review" });
});

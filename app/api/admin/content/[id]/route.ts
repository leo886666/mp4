import { body, notFound, ok, oneOf, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { getSeries, patchSeries } from "@/lib/server/repo/catalog";
import { seriesDTO } from "@/lib/server/dto";
import { run, now } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";
import { creatorForUser } from "@/lib/server/repo/ops";
import { get } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(async (req: Request, { params }: { params: { id: string } }) => {
  const operator = requirePerm("content.write");
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  const data = await body(req);

  const patch: Record<string, any> = {};
  if (data.status !== undefined) {
    patch.status = oneOf(data.status, "status", ["draft", "review", "published", "rejected", "offline"] as const);
    if (patch.status === "published" && !series.published_at) patch.published_at = now();
  }
  if (data.featured !== undefined) patch.featured = data.featured ? 1 : 0;
  if (data.reviewNote !== undefined) patch.review_note = str(data.reviewNote, "reviewNote", { optional: true, max: 500 });
  if (data.rating !== undefined) patch.rating = Math.max(0, Math.min(10, Number(data.rating)));

  const updated = patchSeries(series.id, patch);
  if (patch.status) {
    run("UPDATE episodes SET status = ? WHERE series_id = ? AND status <> 'draft'", patch.status === "published" ? "published" : patch.status, series.id);
    const owner = get<{ user_id: string }>("SELECT user_id FROM creators WHERE id = ?", series.creator_id ?? "");
    if (owner?.user_id) {
      notify({
        userId: owner.user_id,
        kind: "content",
        title: `${series.title} is now ${patch.status}`,
        body: patch.review_note ?? undefined,
        link: `/title/${series.id}`,
      });
    }
  }

  audit({ actorId: operator.id, actorName: operator.name, action: "content.update", targetType: "series", targetId: series.id, detail: patch });
  return ok({ series: seriesDTO(updated!) });
});

import { body, notFound, ok, oneOf, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { decideReview, getReview, getSetting } from "@/lib/server/repo/ops";
import { getSeries, patchSeries } from "@/lib/server/repo/catalog";
import { get, now, run } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Approve/reject a submission — and actually publish or bounce the content. */
export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const operator = requirePerm("review.decide");
  const item = getReview(params.id);
  if (!item) throw notFound("Review item not found");

  const data = await body(req);
  const decision = oneOf(data.decision, "decision", ["approved", "rejected"] as const);
  const note = str(data.note, "note", { optional: true, max: 500 });

  decideReview(item.id, decision, operator.id, note);

  if (item.target_type === "series") {
    const series = getSeries(item.target_id);
    if (series) {
      const autoPublish = getSetting<boolean>("catalog.autoPublishOnApprove");
      const status = decision === "approved" ? (autoPublish ? "published" : "draft") : "rejected";
      patchSeries(series.id, { status, review_note: note ?? null, published_at: status === "published" ? series.published_at ?? now() : series.published_at });
      run("UPDATE episodes SET status = ? WHERE series_id = ?", status === "published" ? "published" : "draft", series.id);
      const owner = get<{ user_id: string }>("SELECT user_id FROM creators WHERE id = ?", series.creator_id ?? "");
      if (owner?.user_id) {
        notify({
          userId: owner.user_id,
          kind: "review",
          title: decision === "approved" ? `${series.title} is live` : `${series.title} needs changes`,
          body: note ?? (decision === "approved" ? "Approved by the review team." : "See the reviewer note in Creator Studio."),
          link: decision === "approved" ? `/title/${series.id}` : "/studio",
        });
      }
    }
  }

  audit({ actorId: operator.id, actorName: operator.name, action: `review.${decision}`, targetType: item.target_type, targetId: item.target_id, detail: { note } });
  return ok({ id: item.id, decision });
});

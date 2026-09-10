import { body, ok, oneOf, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { resolveReport } from "@/lib/server/repo/engagement";
import { hideComment } from "@/lib/server/repo/engagement";
import { patchSeries } from "@/lib/server/repo/catalog";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const operator = requirePerm("reports.handle");
  const data = await body(req);
  const status = oneOf(data.status, "status", ["resolved", "dismissed"] as const);
  const action = oneOf(data.action, "action", ["none", "hide", "offline"] as const, "none");
  const resolution = str(data.resolution, "resolution", { optional: true, max: 400 }) || (status === "resolved" ? "Actioned" : "No violation found");

  const report: any = resolveReport(params.id, status, operator.id, resolution);
  if (report && action === "hide" && report.target_type === "comment") hideComment(report.target_id, "hidden");
  if (report && action === "offline" && report.target_type === "series") patchSeries(report.target_id, { status: "offline", review_note: resolution });

  audit({ actorId: operator.id, actorName: operator.name, action: `report.${status}`, targetType: report?.target_type, targetId: report?.target_id, detail: { action, resolution } });
  return ok({ id: params.id, status, action });
});

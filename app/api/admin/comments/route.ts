import { body, ok, oneOf, paged, paging, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { hideComment, listAllComments } from "@/lib/server/repo/engagement";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("reports.handle");
  const url = new URL(req.url);
  const p = paging(url, 30);
  const { rows, total } = listAllComments({ status: url.searchParams.get("status") ?? undefined, limit: p.perPage, offset: p.offset });
  return ok(paged(rows, total, p));
});

export const PATCH = route(async (req: Request) => {
  const operator = requirePerm("reports.handle");
  const data = await body(req);
  const id = str(data.id, "id");
  const status = oneOf(data.status, "status", ["visible", "hidden", "removed"] as const);
  hideComment(id, status);
  audit({ actorId: operator.id, actorName: operator.name, action: "comment.moderate", targetType: "comment", targetId: id, detail: { status } });
  return ok({ id, status });
});

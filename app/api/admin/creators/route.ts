import { body, notFound, num, ok, paged, paging, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { getCreator, listCreators } from "@/lib/server/repo/ops";
import { update } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("content.read");
  const p = paging(new URL(req.url), 25);
  const { rows, total } = listCreators(p.perPage, p.offset);
  return ok(paged(rows, total, p));
});

export const PATCH = route(async (req: Request) => {
  const operator = requirePerm("content.write");
  const data = await body(req);
  const id = str(data.id, "id");
  if (!getCreator(id)) throw notFound("Creator not found");
  const patch: Record<string, any> = {};
  if (data.shareBps !== undefined) patch.share_bps = num(data.shareBps, "shareBps", { min: 0, max: 10000 });
  if (data.status !== undefined) patch.status = str(data.status, "status", { max: 20 });
  if (data.role !== undefined) patch.role = str(data.role, "role", { max: 40 });
  update("creators", id, patch);
  audit({ actorId: operator.id, actorName: operator.name, action: "creator.update", targetType: "creator", targetId: id, detail: patch });
  return ok({ creator: getCreator(id) });
});

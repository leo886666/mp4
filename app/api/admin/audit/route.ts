import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listAudit } from "@/lib/server/audit";
import { all } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("audit.read");
  const url = new URL(req.url);
  const p = paging(url, 40);
  const { rows, total } = listAudit({
    q: url.searchParams.get("q") ?? undefined,
    action: url.searchParams.get("action") ?? undefined,
    limit: p.perPage,
    offset: p.offset,
  });
  return ok({
    ...paged(rows, total, p),
    actions: all<{ action: string; n: number }>("SELECT action, COUNT(*) AS n FROM audit_logs GROUP BY action ORDER BY n DESC LIMIT 20"),
  });
});

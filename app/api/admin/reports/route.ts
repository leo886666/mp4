import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listReports } from "@/lib/server/repo/engagement";
import { count } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("reports.handle");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listReports({ status: url.searchParams.get("status") ?? undefined, limit: p.perPage, offset: p.offset });
  return ok({
    ...paged(rows, total, p),
    summary: {
      open: count("SELECT COUNT(*) FROM reports WHERE status='open'"),
      resolved: count("SELECT COUNT(*) FROM reports WHERE status='resolved'"),
      dismissed: count("SELECT COUNT(*) FROM reports WHERE status='dismissed'"),
    },
  });
});

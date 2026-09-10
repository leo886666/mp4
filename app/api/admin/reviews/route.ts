import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listReviews } from "@/lib/server/repo/ops";
import { count } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("content.read");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listReviews({ status: url.searchParams.get("status") ?? undefined, limit: p.perPage, offset: p.offset });
  return ok({
    ...paged(rows, total, p),
    summary: {
      pending: count("SELECT COUNT(*) FROM review_items WHERE status='pending'"),
      approved: count("SELECT COUNT(*) FROM review_items WHERE status='approved'"),
      rejected: count("SELECT COUNT(*) FROM review_items WHERE status='rejected'"),
    },
  });
});

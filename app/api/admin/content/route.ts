import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listSeries } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";
import { seriesOps } from "@/lib/server/repo/stats";
import { count } from "@/lib/server/db";
import { pendingReviewCount } from "@/lib/server/repo/ops";
import { queueDepth } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requirePerm("content.read");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listSeries({
    q: url.searchParams.get("q") ?? undefined,
    genre: url.searchParams.get("genre") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    sort: "views",
    limit: p.perPage,
    offset: p.offset,
  });
  return ok({
    ...paged(seriesListDTO(rows), total, p),
    performance: seriesOps(20),
    summary: {
      published: count("SELECT COUNT(*) FROM series WHERE status='published'"),
      review: count("SELECT COUNT(*) FROM series WHERE status='review'"),
      draft: count("SELECT COUNT(*) FROM series WHERE status='draft'"),
      offline: count("SELECT COUNT(*) FROM series WHERE status='offline'"),
      episodes: count("SELECT COUNT(*) FROM episodes"),
      pendingReviews: pendingReviewCount(),
      openReports: count("SELECT COUNT(*) FROM reports WHERE status='open'"),
      mediaProcessing: count("SELECT COUNT(*) FROM media_assets WHERE status IN ('queued','processing')"),
    },
    jobs: queueDepth(),
  });
});

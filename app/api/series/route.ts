import { ok, oneOf, paged, paging, route } from "@/lib/server/http";
import { listSeries } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTS = ["trending", "new", "rating", "views", "updated", "title"] as const;

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const p = paging(url, 24, 60);
  const { rows, total } = listSeries({
    genre: url.searchParams.get("genre") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    status: "published",
    sort: oneOf(url.searchParams.get("sort") ?? undefined, "sort", SORTS, "trending"),
    limit: p.perPage,
    offset: p.offset,
  });
  return ok(paged(seriesListDTO(rows), total, p));
});

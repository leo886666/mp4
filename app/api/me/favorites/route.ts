import { ok, paged, paging, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { favoritesFor } from "@/lib/server/repo/engagement";
import { seriesListDTO } from "@/lib/server/dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = requireUser("site");
  const p = paging(new URL(req.url), 40);
  const { rows, total } = favoritesFor(user.id, p.perPage, p.offset);
  return ok(paged(seriesListDTO(rows as any), total, p));
});

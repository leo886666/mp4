import { notFound, ok, route } from "@/lib/server/http";
import { getSeries } from "@/lib/server/repo/catalog";
import { toggleFavorite } from "@/lib/server/repo/engagement";
import { requireUser } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = requireUser("site");
  if (!getSeries(params.id)) throw notFound("Series not found");
  const favorite = toggleFavorite(user.id, params.id);
  if (favorite) track("favorite", { userId: user.id, seriesId: params.id });
  return ok({ favorite });
});

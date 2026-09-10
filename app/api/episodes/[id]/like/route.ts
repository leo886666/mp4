import { notFound, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { getEpisode } from "@/lib/server/repo/catalog";
import { toggleLike } from "@/lib/server/repo/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = requireUser("site");
  if (!getEpisode(params.id)) throw notFound("Episode not found");
  return ok({ liked: toggleLike(user.id, "episode", params.id) });
});

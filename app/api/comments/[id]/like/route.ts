import { ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { toggleLike } from "@/lib/server/repo/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const user = requireUser("site");
  return ok({ liked: toggleLike(user.id, "comment", params.id) });
});

import { ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { toggleLike } from "@/lib/server/repo/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const user = await requireUser("site");
  return ok({ liked: toggleLike(user.id, "comment", params.id) });
});

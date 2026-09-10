import { ok, route } from "@/lib/server/http";
import { titleView } from "@/lib/server/services/views";
import { optionalUser } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const user = await optionalUser("site");
  const view = titleView(params.id, user);
  track("series_view", { userId: user?.id ?? null, seriesId: params.id });
  return ok(view);
});

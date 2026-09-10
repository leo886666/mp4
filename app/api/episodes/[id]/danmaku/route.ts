import { body, notFound, num, ok, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { addDanmaku, danmakuFor } from "@/lib/server/repo/engagement";
import { getEpisode } from "@/lib/server/repo/catalog";
import { getSetting } from "@/lib/server/repo/ops";
import { forbidden } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  return Response.json({ ok: true, data: { items: danmakuFor(params.id, 400).map((d) => ({ t: d.t_ms, body: d.body, color: d.color })) } });
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  if (!getSetting<boolean>("player.danmakuEnabled")) throw forbidden("Bullet comments are disabled");
  const user = await requireUser("site");
  if (!getEpisode(params.id)) throw notFound("Episode not found");
  const data = await body(req);
  const id = addDanmaku({
    userId: user.id,
    episodeId: params.id,
    tMs: num(data.tMs, "tMs", { min: 0 }),
    body: str(data.body, "body", { min: 1, max: 80 }),
    color: str(data.color, "color", { optional: true }) || "#ffffff",
  });
  return ok({ id });
});

import { body, notFound, ok, paged, paging, route, str } from "@/lib/server/http";
import { getSeries } from "@/lib/server/repo/catalog";
import { addComment, listComments } from "@/lib/server/repo/engagement";
import { optionalUser, requireUser } from "@/lib/server/session";
import { getSetting } from "@/lib/server/repo/ops";
import { track } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BANNED = ["http://", "https://", "t.me/", "wechat"];

export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const p = paging(new URL(req.url), 20);
  const { rows, total } = listComments(params.id, p.perPage, p.offset);
  return ok(
    paged(
      rows.map((c: any) => ({
        id: c.id,
        body: c.body,
        likes: c.likes,
        createdAt: c.created_at,
        episodeId: c.episode_id,
        user: { name: c.user_name, initials: c.initials, vip: (c.vip_until ?? 0) > Date.now() },
      })),
      total,
      p
    )
  );
});

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const user = await requireUser("site");
  if (!getSeries(params.id)) throw notFound("Series not found");
  const data = await body(req);
  let text = str(data.body, "body", { min: 1, max: 500 });

  if (getSetting<boolean>("moderation.commentFilter")) {
    const lower = text.toLowerCase();
    if (BANNED.some((b) => lower.includes(b))) text = text.replace(/https?:\/\/\S+/gi, "[link removed]");
  }

  const comment: any = addComment({
    userId: user.id,
    seriesId: params.id,
    episodeId: typeof data.episodeId === "string" ? data.episodeId : null,
    body: text,
  });
  track("comment", { userId: user.id, seriesId: params.id });
  return ok({
    comment: {
      id: comment.id,
      body: comment.body,
      likes: 0,
      createdAt: comment.created_at,
      user: { name: comment.user_name, initials: comment.initials, vip: (user.vip_until ?? 0) > Date.now() },
    },
  });
});

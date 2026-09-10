import { body, notFound, num, ok, oneOf, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { findById, grantVip, patchUser, toPublic, userStats } from "@/lib/server/repo/users";
import { activeSubscription, listOrders } from "@/lib/server/repo/commerce";
import { revokeAllForUser, sessionsForUser } from "@/lib/server/session";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";
import { historyFor } from "@/lib/server/repo/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  await requirePerm("users.read");
  const user = findById(params.id);
  if (!user) throw notFound("User not found");
  const sub = activeSubscription(user.id);
  return ok({
    user: { ...toPublic(user), country: user.country, channel: user.channel, campaignId: user.campaign_id, lastSeenAt: user.last_seen_at },
    stats: userStats(user.id),
    subscription: sub,
    orders: listOrders({ userId: user.id, limit: 20, offset: 0 }).rows,
    sessions: sessionsForUser(user.id),
    history: historyFor(user.id, 10, 0).rows,
  });
});

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const operator = await requirePerm("users.write");
  const target = findById(params.id);
  if (!target) throw notFound("User not found");
  const data = await body(req);

  const patch: Record<string, any> = {};
  if (data.status !== undefined) patch.status = oneOf(data.status, "status", ["active", "suspended"] as const);
  if (data.role !== undefined) patch.role = oneOf(data.role, "role", ["user", "creator", "reviewer", "admin", "owner"] as const);
  if (data.name !== undefined) patch.name = str(data.name, "name", { min: 2, max: 40 });

  if (data.grantVipDays !== undefined) {
    const days = num(data.grantVipDays, "grantVipDays", { min: -3650, max: 3650 });
    if (days > 0) {
      grantVip(target.id, days);
      notify({ userId: target.id, kind: "vip", title: "VIP granted", body: `${days} days of VIP were added to your account.`, link: "/me" });
    } else {
      patch.vip_until = Math.max(0, (target.vip_until ?? 0) + days * 86400_000);
    }
  }

  const updated = patchUser(target.id, patch);
  if (patch.status === "suspended") revokeAllForUser(target.id);

  audit({
    actorId: operator.id, actorName: operator.name, action: "user.update",
    targetType: "user", targetId: target.id, detail: { ...patch, grantVipDays: data.grantVipDays },
  });
  return ok({ user: toPublic(updated!) });
});

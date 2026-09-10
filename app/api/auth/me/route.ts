import { body, ok, route, str } from "@/lib/server/http";
import { currentUser, requireUser } from "@/lib/server/session";
import { initialsOf, patchUser, toPublic, userStats } from "@/lib/server/repo/users";
import { activeSubscription, entitlementsFor } from "@/lib/server/repo/commerce";
import { creatorForUser } from "@/lib/server/repo/ops";
import { unreadCount } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = currentUser("site");
  if (!user) return ok({ user: null });
  const sub = activeSubscription(user.id);
  return ok({
    user,
    subscription: sub
      ? { id: sub.id, planId: sub.plan_id, status: sub.status, autoRenew: !!sub.auto_renew, currentPeriodEnd: sub.current_period_end }
      : null,
    entitlements: entitlementsFor(user.id),
    creator: creatorForUser(user.id),
    stats: userStats(user.id),
    unread: unreadCount(user.id),
  });
});

export const PATCH = route(async (req: Request) => {
  const user = requireUser("site");
  const data = await body(req);
  const name = str(data.name, "name", { min: 2, max: 40, optional: true });
  const patch: Record<string, any> = {};
  if (name) {
    patch.name = name;
    patch.initials = initialsOf(name);
  }
  if (typeof data.country === "string") patch.country = data.country.slice(0, 40);
  if (typeof data.avatarUrl === "string") patch.avatar_url = data.avatarUrl.slice(0, 300);
  const updated = patchUser(user.id, patch);
  return ok({ user: toPublic(updated!) });
});

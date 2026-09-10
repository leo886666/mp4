import { body, notFound, ok, oneOf, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { activeSubscription, cancelSubscription, getPlan, resumeSubscription, toPlan } from "@/lib/server/repo/commerce";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const user = await requireUser("site");
  const sub = activeSubscription(user.id);
  if (!sub) return ok({ subscription: null, vipUntil: user.vip_until });
  const plan = getPlan(sub.plan_id);
  return ok({
    subscription: {
      id: sub.id,
      status: sub.status,
      autoRenew: !!sub.auto_renew,
      startedAt: sub.started_at,
      currentPeriodEnd: sub.current_period_end,
      gateway: sub.gateway,
      plan: plan ? toPlan(plan) : null,
    },
    vipUntil: user.vip_until,
  });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser("site");
  const data = await body(req);
  const action = oneOf(data.action, "action", ["cancel", "resume"] as const);
  const sub = action === "cancel" ? cancelSubscription(user.id) : resumeSubscription(user.id);
  if (!sub) throw notFound("No active subscription");
  audit({ actorId: user.id, actorName: user.name, action: `subscription.${action}`, targetType: "subscription", targetId: sub.id });
  notify({
    userId: user.id,
    kind: "subscription",
    title: action === "cancel" ? "Auto-renew is off" : "Auto-renew is back on",
    body: action === "cancel" ? "You keep VIP until the end of this period." : "Your plan will renew automatically.",
    link: "/me",
  });
  return ok({ autoRenew: !!sub.auto_renew, currentPeriodEnd: sub.current_period_end });
});

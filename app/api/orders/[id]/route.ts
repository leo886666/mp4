import { forbidden, notFound, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { getOrder, getPlan, netCents, toPlan } from "@/lib/server/repo/commerce";
import { MockGateway } from "@/lib/server/payments/mock";
import { isStaff } from "@/lib/server/rbac";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const user = await requireUser("site");
  const order = getOrder(params.id);
  if (!order) throw notFound("Order not found");
  if (order.user_id !== user.id && !isStaff(user.role)) throw forbidden();
  const plan = order.plan_id ? getPlan(order.plan_id) : null;
  return ok({
    order: {
      id: order.id,
      kind: order.kind,
      title: order.title,
      amount: netCents(order) / 100,
      discount: order.discount_cents / 100,
      currency: order.currency,
      status: order.status,
      gateway: order.gateway,
      couponCode: order.coupon_code,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      plan: plan ? toPlan(plan) : null,
    },
    // the hosted mock checkout signs its own callback with this
    confirmToken: order.gateway === "mock" && order.status === "pending" ? MockGateway.signConfirmation(order.id, netCents(order)) : null,
  });
});

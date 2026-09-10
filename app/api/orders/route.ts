import { body, ok, oneOf, paged, paging, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { listOrders } from "@/lib/server/repo/commerce";
import { startCheckout } from "@/lib/server/services/orders";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["subscription", "episode", "series"] as const;

/** Create an order and hand back a gateway checkout session. */
export const POST = route(async (req: Request) => {
  const user = await requireUser("site");
  const data = await body(req);
  const kind = oneOf(data.kind, "kind", KINDS);
  const { order, session } = await startCheckout({
    userId: user.id,
    kind,
    planId: str(data.planId, "planId", { optional: true }) || undefined,
    refId: str(data.refId, "refId", { optional: true }) || undefined,
    couponCode: str(data.couponCode, "couponCode", { optional: true }) || undefined,
    gatewayId: str(data.gateway, "gateway", { optional: true }) || env.gateway,
    country: user.country ?? "US",
  });
  return ok({
    order: {
      id: order.id,
      title: order.title,
      amount: (order.amount_cents - order.discount_cents) / 100,
      discount: order.discount_cents / 100,
      status: order.status,
      gateway: order.gateway,
    },
    checkoutUrl: session.url,
    expiresAt: session.expiresAt,
  });
});

export const GET = route(async (req: Request) => {
  const user = await requireUser("site");
  const p = paging(new URL(req.url), 20);
  const { rows, total } = listOrders({ userId: user.id, limit: p.perPage, offset: p.offset });
  return ok(paged(rows, total, p));
});

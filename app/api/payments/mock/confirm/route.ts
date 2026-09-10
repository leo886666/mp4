import { body, ok, oneOf, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { gateway } from "@/lib/server/payments";
import { fulfillOrder } from "@/lib/server/services/orders";
import { badRequest } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * What the hosted mock checkout page posts when the user taps "Pay".
 * It goes through the exact same parse -> fulfil path as a real webhook.
 */
export const POST = route(async (req: Request) => {
  await requireUser("site");
  const data = await body(req);
  const payload = {
    gateway: "mock",
    token: str(data.token, "token"),
    outcome: oneOf(data.outcome, "outcome", ["succeeded", "failed"] as const, "succeeded"),
    method: str(data.method, "method", { optional: true }) || "card",
    ref: `mock_${Date.now().toString(36)}`,
  };
  const event = await gateway("mock").parseWebhook(req, JSON.stringify(payload));
  if (!event) throw badRequest("Checkout token is invalid or expired");
  const { order } = fulfillOrder(event);
  return ok({ orderId: order.id, status: order.status });
});

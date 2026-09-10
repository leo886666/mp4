import { badRequest, ok, route } from "@/lib/server/http";
import { gateway } from "@/lib/server/payments";
import { fulfillOrder } from "@/lib/server/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Single inbound webhook for every gateway.
 *
 * The body says which gateway sent it; that gateway authenticates the payload
 * (HMAC for Stripe, signed token for mock, receipt verification for the
 * stores) before a single row is written.
 */
export const POST = route(async (req: Request) => {
  const raw = await req.text();
  let gatewayId = req.headers.get("stripe-signature") ? "stripe" : undefined;
  if (!gatewayId) {
    try {
      gatewayId = JSON.parse(raw || "{}").gateway;
    } catch {
      /* fall through */
    }
  }
  const gw = gateway(gatewayId);
  const event = await gw.parseWebhook(req, raw);
  if (!event) throw badRequest("Unrecognised webhook payload");

  const { order, alreadyPaid } = fulfillOrder(event);
  return ok({ orderId: order.id, status: order.status, alreadyPaid });
});

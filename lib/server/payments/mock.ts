import { sign, verify } from "../crypto";
import { env } from "../env";
import type { Gateway, GatewayEvent } from "./index";
import type { OrderRow } from "../repo/commerce";
import { netCents } from "../repo/commerce";

/**
 * Local gateway used for development and demos.
 *
 * It behaves exactly like a hosted checkout: signed session token, a hosted
 * page (/checkout/[orderId]), and a signed webhook posted back to
 * /api/webhooks/payments. Nothing downstream knows it isn't Stripe.
 */
export class MockGateway implements Gateway {
  readonly id = "mock";
  readonly label = "Mock gateway";

  async createCheckout(order: OrderRow, opts: { returnUrl: string; cancelUrl: string }) {
    const token = sign({ orderId: order.id, amount: netCents(order), r: opts.returnUrl }, 30 * 60);
    return {
      orderId: order.id,
      gateway: this.id,
      url: `/checkout/${order.id}?t=${encodeURIComponent(token)}`,
      expiresAt: Date.now() + 30 * 60_000,
    };
  }

  async parseWebhook(_req: Request, rawBody: string): Promise<GatewayEvent | null> {
    const body = JSON.parse(rawBody || "{}");
    if (body.gateway !== this.id) return null;
    const claims = verify<{ orderId: string; amount: number }>(body.token || "");
    if (!claims) return null;
    return {
      type: body.outcome === "failed" ? "payment.failed" : "payment.succeeded",
      orderId: claims.orderId,
      gatewayRef: body.ref || `mock_${claims.orderId}`,
      amountCents: claims.amount,
      method: body.method || "card",
      raw: body,
    };
  }

  async refund(order: OrderRow, amountCents: number) {
    return { ok: true, ref: `mock_re_${order.id}_${amountCents}` };
  }

  /** Used by the hosted checkout page to sign its own callback. */
  static signConfirmation(orderId: string, amountCents: number) {
    return sign({ orderId, amount: amountCents }, 30 * 60);
  }

  static siteUrl() {
    return env.siteUrl;
  }
}

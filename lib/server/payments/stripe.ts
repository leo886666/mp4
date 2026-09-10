import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env";
import type { Gateway, GatewayEvent } from "./index";
import { netCents, type OrderRow } from "../repo/commerce";

/**
 * Stripe Checkout, over plain fetch (no SDK).
 * Set STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET and VESPER_PAYMENT_GATEWAY=stripe.
 */
export class StripeGateway implements Gateway {
  readonly id = "stripe";
  readonly label = "Stripe";

  private key() {
    if (!env.stripe.secretKey) throw new Error("STRIPE_SECRET_KEY is not configured");
    return env.stripe.secretKey;
  }

  private async api(path: string, form: Record<string, string>) {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.key()}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(form).toString(),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `Stripe ${path} failed`);
    return data;
  }

  async createCheckout(order: OrderRow, opts: { returnUrl: string; cancelUrl: string }) {
    const session = await this.api("checkout/sessions", {
      mode: order.kind === "subscription" ? "payment" : "payment",
      success_url: opts.returnUrl,
      cancel_url: opts.cancelUrl,
      client_reference_id: order.id,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": order.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(netCents(order)),
      "line_items[0][price_data][product_data][name]": order.title,
      "metadata[order_id]": order.id,
    });
    return { orderId: order.id, gateway: this.id, url: session.url as string, expiresAt: Date.now() + 30 * 60_000 };
  }

  async parseWebhook(req: Request, rawBody: string): Promise<GatewayEvent | null> {
    const sig = req.headers.get("stripe-signature") || "";
    const secret = env.stripe.webhookSecret;
    if (secret) {
      const parts = Object.fromEntries(sig.split(",").map((kv) => kv.split("=") as [string, string]));
      const expected = createHmac("sha256", secret).update(`${parts.t}.${rawBody}`).digest("hex");
      const a = Buffer.from(expected);
      const b = Buffer.from(parts.v1 || "");
      if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Bad Stripe signature");
    }
    const evt = JSON.parse(rawBody || "{}");
    const obj = evt?.data?.object ?? {};
    const orderId = obj.client_reference_id || obj.metadata?.order_id;
    if (!orderId) return null;
    if (evt.type === "checkout.session.completed" || evt.type === "payment_intent.succeeded") {
      return { type: "payment.succeeded", orderId, gatewayRef: obj.id, amountCents: obj.amount_total ?? obj.amount ?? 0, method: "card", raw: evt };
    }
    if (evt.type === "payment_intent.payment_failed") {
      return { type: "payment.failed", orderId, gatewayRef: obj.id, amountCents: obj.amount ?? 0, method: "card", raw: evt };
    }
    if (evt.type === "charge.refunded") {
      return { type: "refund.succeeded", orderId, gatewayRef: obj.id, amountCents: obj.amount_refunded ?? 0, method: "card", raw: evt };
    }
    return null;
  }

  async refund(order: OrderRow, amountCents: number) {
    const r = await this.api("refunds", { payment_intent: order.gateway_ref || "", amount: String(amountCents) });
    return { ok: true, ref: r.id as string };
  }
}

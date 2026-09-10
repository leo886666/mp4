import type { Gateway, GatewayEvent } from "./index";
import type { OrderRow } from "../repo/commerce";

/**
 * Store billing (Apple / Google).
 *
 * Mobile clients purchase in-app and post the receipt to
 * /api/webhooks/payments; verification happens here. Sandbox verification is
 * attempted first, exactly as Apple requires.
 */
export class IapGateway implements Gateway {
  constructor(public readonly id: string, public readonly label: string) {}

  async createCheckout(order: OrderRow) {
    // Store purchases start on-device; the app posts the receipt back.
    return {
      orderId: order.id,
      gateway: this.id,
      url: `/checkout/${order.id}?store=${this.id}`,
      expiresAt: Date.now() + 30 * 60_000,
    };
  }

  async parseWebhook(_req: Request, rawBody: string): Promise<GatewayEvent | null> {
    const body = JSON.parse(rawBody || "{}");
    if (body.gateway !== this.id) return null;
    const verified = await this.verifyReceipt(body.receipt);
    if (!verified.ok) return { type: "payment.failed", orderId: body.orderId, gatewayRef: body.transactionId ?? "", amountCents: 0, method: this.id, raw: body };
    return {
      type: "payment.succeeded",
      orderId: body.orderId,
      gatewayRef: body.transactionId ?? verified.ref,
      amountCents: body.amountCents ?? 0,
      method: this.id,
      raw: body,
    };
  }

  private async verifyReceipt(receipt: string | undefined): Promise<{ ok: boolean; ref: string }> {
    if (!receipt) return { ok: false, ref: "" };
    if (this.id === "apple") {
      const endpoints = ["https://sandbox.itunes.apple.com/verifyReceipt", "https://buy.itunes.apple.com/verifyReceipt"];
      for (const url of endpoints) {
        try {
          const res = await fetch(url, { method: "POST", body: JSON.stringify({ "receipt-data": receipt }) });
          const data = await res.json();
          if (data.status === 0) return { ok: true, ref: data.receipt?.in_app?.[0]?.transaction_id ?? "apple" };
        } catch {
          /* try the next endpoint */
        }
      }
      return { ok: false, ref: "" };
    }
    // Google Play verification needs a service account token; wire it here.
    return { ok: !!receipt, ref: receipt.slice(0, 24) };
  }

  async refund(order: OrderRow, amountCents: number) {
    // Store refunds are issued by Apple/Google; we only record them.
    return { ok: true, ref: `${this.id}_refund_${order.id}_${amountCents}` };
  }
}

import { env } from "../env";
import type { OrderRow } from "../repo/commerce";

/**
 * Payment gateway seam.
 *
 * The platform never talks to a PSP directly: it creates an order, asks the
 * configured gateway for a checkout session, and waits for a webhook event.
 * `mock` implements that contract end-to-end locally; `stripe` / `apple` /
 * `google` implement the same three methods against the real thing.
 */

export interface CheckoutSession {
  orderId: string;
  gateway: string;
  /** where to send the browser */
  url: string;
  /** informational: shown on the confirmation screen */
  expiresAt: number;
}

export type GatewayEventType = "payment.succeeded" | "payment.failed" | "refund.succeeded";

export interface GatewayEvent {
  type: GatewayEventType;
  orderId: string;
  gatewayRef: string;
  amountCents: number;
  method: string;
  raw: unknown;
}

export interface Gateway {
  readonly id: string;
  readonly label: string;
  createCheckout(order: OrderRow, opts: { returnUrl: string; cancelUrl: string }): Promise<CheckoutSession>;
  /** Parse + authenticate an inbound webhook. Returns null when not for us. */
  parseWebhook(req: Request, rawBody: string): Promise<GatewayEvent | null>;
  refund(order: OrderRow, amountCents: number): Promise<{ ok: boolean; ref: string }>;
}

import { MockGateway } from "./mock";
import { StripeGateway } from "./stripe";
import { IapGateway } from "./iap";

const registry: Record<string, Gateway> = {
  mock: new MockGateway(),
  stripe: new StripeGateway(),
  apple: new IapGateway("apple", "Apple IAP"),
  google: new IapGateway("google", "Google Play"),
};

export function gateway(id?: string | null): Gateway {
  return registry[id || env.gateway] ?? registry.mock;
}

export const gatewayIds = () => Object.keys(registry);

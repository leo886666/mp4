import { all, insert, now, run, tx, update } from "../db";
import { newId } from "../ids";
import { audit } from "../audit";
import { track } from "../repo/stats";
import { notify } from "../notify";
import { gateway, type GatewayEvent } from "../payments";
import {
  createOrder, getOrder, getPlan, grantEntitlement, ledgerEntry, netCents,
  redeemCoupon, upsertSubscription, validateCoupon, type OrderRow,
} from "../repo/commerce";
import { getEpisode, getSeries } from "../repo/catalog";
import { grantVip, findById } from "../repo/users";
import { badRequest, notFound } from "../http";
import { env } from "../env";

/* -------------------------------- checkout -------------------------------- */

export interface CheckoutInput {
  userId: string;
  kind: "subscription" | "episode" | "series";
  planId?: string;
  refId?: string;
  couponCode?: string;
  gatewayId?: string;
  country?: string;
}

export async function startCheckout(input: CheckoutInput) {
  let title = "";
  let amountCents = 0;
  let planId: string | null = null;
  let refId: string | null = null;

  if (input.kind === "subscription") {
    const plan = getPlan(input.planId || "");
    if (!plan || !plan.active) throw notFound("Plan not available");
    title = `VESPER VIP — ${plan.name}`;
    amountCents = plan.price_cents;
    planId = plan.id;
  } else if (input.kind === "episode") {
    const ep = getEpisode(input.refId || "");
    if (!ep) throw notFound("Episode not found");
    const series = getSeries(ep.series_id)!;
    title = `${series.title} — EP ${ep.n}`;
    amountCents = ep.price_cents || series.ppe_price_cents;
    refId = ep.id;
  } else {
    const series = getSeries(input.refId || "");
    if (!series) throw notFound("Series not found");
    title = `${series.title} — full season`;
    amountCents = Math.max(199, Math.round(series.ppe_price_cents * Math.max(1, series.episode_count - series.free_episodes) * 0.45));
    refId = series.id;
  }

  let discountCents = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const c = validateCoupon(input.couponCode, planId, amountCents);
    if (!c.valid) throw badRequest(c.reason);
    discountCents = c.discountCents;
    couponCode = c.code;
  }

  const gw = gateway(input.gatewayId);
  const order = createOrder({
    userId: input.userId,
    kind: input.kind,
    planId,
    refId,
    title,
    amountCents,
    discountCents,
    couponCode,
    gateway: gw.id,
    country: input.country ?? "US",
  });

  const session = await gw.createCheckout(order, {
    returnUrl: `${env.siteUrl}/checkout/${order.id}?state=success`,
    cancelUrl: `${env.siteUrl}/checkout/${order.id}?state=cancel`,
  });

  track("checkout_started", { userId: input.userId, value: netCents(order) / 100, props: { orderId: order.id, kind: input.kind } });
  return { order, session };
}

/* -------------------------------- fulfilment ------------------------------ */

export function fulfillOrder(evt: GatewayEvent) {
  const order = getOrder(evt.orderId);
  if (!order) throw notFound("Order not found");
  if (order.status === "paid") return { order, alreadyPaid: true };

  if (evt.type === "payment.failed") {
    update("orders", order.id, { status: "failed" });
    insert("payments", {
      id: newId("pmt"), order_id: order.id, gateway: evt.gatewayRef ? order.gateway : order.gateway,
      gateway_ref: evt.gatewayRef, amount_cents: evt.amountCents, status: "failed", method: evt.method,
      raw: JSON.stringify(evt.raw ?? {}), created_at: now(),
    });
    track("purchase_failed", { userId: order.user_id, props: { orderId: order.id } });
    return { order: getOrder(order.id)!, alreadyPaid: false };
  }

  const ts = now();
  const paid = netCents(order);

  tx(() => {
    update("orders", order.id, { status: "paid", paid_at: ts, gateway_ref: evt.gatewayRef });
    insert("payments", {
      id: newId("pmt"), order_id: order.id, gateway: order.gateway, gateway_ref: evt.gatewayRef,
      amount_cents: paid, status: "succeeded", method: evt.method, raw: JSON.stringify(evt.raw ?? {}), created_at: ts,
    });
    if (order.coupon_code) redeemCoupon(order.coupon_code);

    if (order.kind === "subscription" && order.plan_id) {
      const plan = getPlan(order.plan_id)!;
      upsertSubscription({ userId: order.user_id, planId: plan.id, orderId: order.id, days: plan.days, gateway: order.gateway });
      grantVip(order.user_id, plan.days);
      // Subscription money lands in the shared pool and is split monthly by watch time.
      ledgerEntry({ creatorId: null, seriesId: null, orderId: order.id, kind: "pool", grossCents: paid, netCents: 0, note: `VIP ${plan.name}` });
      notify({ userId: order.user_id, kind: "vip", title: "VIP is active", body: `${plan.name} — enjoy every episode, ad-free.`, link: "/me" });
    } else if (order.kind === "episode" && order.ref_id) {
      grantEntitlement({ userId: order.user_id, kind: "episode", refId: order.ref_id, orderId: order.id });
      const ep = getEpisode(order.ref_id);
      const series = ep ? getSeries(ep.series_id) : null;
      if (series?.creator_id) {
        ledgerEntry({ creatorId: series.creator_id, seriesId: series.id, orderId: order.id, kind: "share", grossCents: paid, note: order.title });
      }
      notify({ userId: order.user_id, kind: "unlock", title: "Episode unlocked", body: order.title, link: ep ? `/watch/${series?.id}?ep=${ep.n}` : "/me" });
    } else if (order.kind === "series" && order.ref_id) {
      grantEntitlement({ userId: order.user_id, kind: "series", refId: order.ref_id, orderId: order.id });
      const series = getSeries(order.ref_id);
      if (series?.creator_id) {
        ledgerEntry({ creatorId: series.creator_id, seriesId: series.id, orderId: order.id, kind: "share", grossCents: paid, note: order.title });
      }
      notify({ userId: order.user_id, kind: "unlock", title: "Season unlocked", body: order.title, link: `/title/${order.ref_id}` });
    }
  });

  track("purchase", { userId: order.user_id, value: paid / 100, props: { orderId: order.id, kind: order.kind } });
  audit({ actorId: order.user_id, actorName: findById(order.user_id)?.name ?? null, action: "order.paid", targetType: "order", targetId: order.id, detail: { amountCents: paid, gateway: order.gateway } });
  return { order: getOrder(order.id)!, alreadyPaid: false };
}

/* --------------------------------- refunds -------------------------------- */

export async function refundOrder(orderId: string, operatorId: string, reason: string, amountCents?: number) {
  const order = getOrder(orderId);
  if (!order) throw notFound("Order not found");
  if (order.status !== "paid") throw badRequest("Only paid orders can be refunded");
  const amount = amountCents ?? netCents(order);
  const gw = gateway(order.gateway);
  const res = await gw.refund(order, amount);
  if (!res.ok) throw badRequest("Gateway refused the refund");

  tx(() => {
    update("orders", order.id, { status: "refunded" });
    insert("refunds", {
      id: newId("ref"), order_id: order.id, amount_cents: amount, reason,
      status: "succeeded", operator_id: operatorId, created_at: now(),
    });
    if (order.kind === "subscription") {
      run("UPDATE subscriptions SET status='canceled', auto_renew=0, canceled_at=? WHERE order_id=?", now(), order.id);
      run("UPDATE users SET vip_until = ? WHERE id = ?", now(), order.user_id);
    } else if (order.ref_id) {
      run("DELETE FROM entitlements WHERE order_id = ?", order.id);
    }
    ledgerEntry({ creatorId: null, seriesId: null, orderId: order.id, kind: "adjust", grossCents: -amount, netCents: 0, note: `Refund: ${reason}` });
  });

  notify({ userId: order.user_id, kind: "refund", title: "Refund issued", body: `${order.title} — $${(amount / 100).toFixed(2)}`, link: "/me/orders" });
  audit({ actorId: operatorId, action: "order.refund", targetType: "order", targetId: order.id, detail: { amount, reason } });
  return getOrder(order.id)!;
}

/* ------------------------------- renewals --------------------------------- */

/** Called by the 'renewals' job: charges auto-renew subs whose period ended. */
export function processRenewals(limit = 50) {
  const due = all<{ id: string; user_id: string; plan_id: string }>(
    "SELECT id, user_id, plan_id FROM subscriptions WHERE status='active' AND auto_renew=1 AND current_period_end <= ? LIMIT ?",
    now(), limit
  );
  let renewed = 0;
  for (const sub of due) {
    const plan = getPlan(sub.plan_id);
    if (!plan) continue;
    const order = createOrder({
      userId: sub.user_id, kind: "subscription", planId: plan.id,
      title: `VESPER VIP — ${plan.name} (renewal)`, amountCents: plan.price_cents, gateway: "mock",
    });
    fulfillOrder({ type: "payment.succeeded", orderId: order.id, gatewayRef: `renew_${order.id}`, amountCents: plan.price_cents, method: "auto", raw: { renewal: true } });
    renewed++;
  }
  run("UPDATE subscriptions SET status='expired' WHERE status='active' AND auto_renew=0 AND current_period_end <= ?", now());
  return renewed;
}

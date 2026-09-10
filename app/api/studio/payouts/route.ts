import { badRequest, body, num, ok, route } from "@/lib/server/http";
import { requireCreator } from "@/lib/server/services/studio";
import { createPayout, listPayouts } from "@/lib/server/repo/commerce";
import { getSetting } from "@/lib/server/repo/ops";
import { audit } from "@/lib/server/audit";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const { creator } = await requireCreator();
  return ok({
    balance: creator.balance_cents / 100,
    minPayout: getSetting<number>("creator.minPayoutCents") / 100,
    payouts: listPayouts({ creatorId: creator.id, limit: 30, offset: 0 }).rows,
  });
});

/** Withdraw request — lands in the console's payout queue as 'pending'. */
export const POST = route(async (req: Request) => {
  const { user, creator } = await requireCreator();
  const data = await body(req).catch(() => ({}) as any);
  const min = getSetting<number>("creator.minPayoutCents");
  const amountCents = Math.round(num(data.amount, "amount", { optional: true, def: creator.balance_cents / 100 }) * 100);
  if (amountCents < min) throw badRequest(`Minimum withdrawal is $${(min / 100).toFixed(2)}`);
  if (amountCents > creator.balance_cents) throw badRequest("Amount exceeds your available balance");

  const id = createPayout({
    creatorId: creator.id,
    period: new Date().toISOString().slice(0, 7),
    grossCents: amountCents,
    netCents: amountCents,
    status: "pending",
    note: "Creator-requested withdrawal",
  });
  notify({ userId: user.id, kind: "payout", title: "Withdrawal requested", body: `$${(amountCents / 100).toFixed(2)} — finance will process it within 3 business days.`, link: "/studio" });
  audit({ actorId: user.id, actorName: user.name, action: "payout.request", targetType: "payout", targetId: id, detail: { amountCents } });
  return ok({ id, amount: amountCents / 100, status: "pending" });
});

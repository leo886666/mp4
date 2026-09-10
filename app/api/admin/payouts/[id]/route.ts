import { body, notFound, ok, oneOf, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { markPayout } from "@/lib/server/repo/commerce";
import { audit } from "@/lib/server/audit";
import { get } from "@/lib/server/db";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const operator = await requirePerm("payouts.write");
  const data = await body(req);
  const status = oneOf(data.status, "status", ["scheduled", "paid", "hold", "pending"] as const);
  const payout: any = markPayout(params.id, status, operator.id);
  if (!payout) throw notFound("Payout not found");

  const owner = get<{ user_id: string }>("SELECT user_id FROM creators WHERE id = ?", payout.creator_id);
  if (owner?.user_id) {
    notify({
      userId: owner.user_id,
      kind: "payout",
      title: status === "paid" ? "Payout sent" : `Payout ${status}`,
      body: `$${(payout.net_cents / 100).toFixed(2)} · ${payout.period}`,
      link: "/studio",
    });
  }
  audit({ actorId: operator.id, actorName: operator.name, action: `payout.${status}`, targetType: "payout", targetId: params.id });
  return ok({ payout });
});

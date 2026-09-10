import { body, ok, paged, paging, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listPayouts, settlePeriod } from "@/lib/server/repo/commerce";
import { all, count } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("console.view");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listPayouts({ status: url.searchParams.get("status") ?? undefined, limit: p.perPage, offset: p.offset });
  return ok({
    ...paged(rows, total, p),
    creators: all(`SELECT c.id, c.name, c.share_bps, c.balance_cents,
                          (SELECT COUNT(*) FROM series s WHERE s.creator_id = c.id) AS series_count
                   FROM creators c ORDER BY c.balance_cents DESC`),
    summary: {
      pendingCents: count("SELECT COALESCE(SUM(net_cents),0) FROM payouts WHERE status IN ('pending','scheduled')"),
      paidCents: count("SELECT COALESCE(SUM(net_cents),0) FROM payouts WHERE status='paid'"),
      holdCents: count("SELECT COALESCE(SUM(net_cents),0) FROM payouts WHERE status='hold'"),
      poolCents: count("SELECT COALESCE(SUM(gross_cents),0) FROM ledger WHERE kind='pool'"),
    },
  });
});

/** Run monthly settlement: split the VIP pool by watch time, create payouts. */
export const POST = route(async (req: Request) => {
  const operator = requirePerm("payouts.write");
  const data = await body(req).catch(() => ({}) as any);
  const period = str(data.period, "period", { optional: true }) || new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 7);
  const result = settlePeriod(period, operator.id);
  audit({ actorId: operator.id, actorName: operator.name, action: "payout.settle", targetType: "period", targetId: period, detail: result });
  return ok({ period, ...result });
});

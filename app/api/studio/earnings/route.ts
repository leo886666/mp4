import { ok, route } from "@/lib/server/http";
import { requireCreator } from "@/lib/server/services/studio";
import { creatorEarnings, creatorLedger, listPayouts } from "@/lib/server/repo/commerce";
import { all } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400_000;

export const GET = route(async () => {
  const { creator } = await requireCreator();
  const since = Date.now() - 90 * DAY;
  return ok({
    balance: creator.balance_cents / 100,
    shareBps: creator.share_bps,
    last30: creatorEarnings(creator.id, Date.now() - 30 * DAY),
    lifetime: creatorEarnings(creator.id, 0),
    daily: all<{ d: string; net: number }>(
      `SELECT date(ts/1000,'unixepoch') AS d, COALESCE(SUM(net_cents),0) AS net
       FROM ledger WHERE creator_id = ? AND ts > ? GROUP BY d ORDER BY d ASC`,
      creator.id, since
    ),
    ledger: creatorLedger(creator.id, 40),
    payouts: listPayouts({ creatorId: creator.id, limit: 20, offset: 0 }).rows,
  });
});

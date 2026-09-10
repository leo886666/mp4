import { ok, route } from "@/lib/server/http";
import { count } from "@/lib/server/db";
import { creatorContext } from "@/lib/server/services/studio";
import { listSeries } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";
import { creatorEarnings } from "@/lib/server/repo/commerce";
import { all } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 86400_000;

export const GET = route(async () => {
  const { user, creator } = creatorContext(true);
  const cid = creator!.id;
  const since30 = Date.now() - 30 * DAY;

  const { rows } = listSeries({ creatorId: cid, limit: 100, offset: 0, sort: "updated" });
  const earnings = creatorEarnings(cid, since30);

  return ok({
    creator: {
      id: cid,
      name: creator!.name,
      initials: creator!.initials,
      role: creator!.role,
      followers: creator!.followers,
      shareBps: creator!.share_bps,
      balance: creator!.balance_cents / 100,
    },
    user: { id: user.id, name: user.name },
    stats: {
      series: rows.length,
      published: rows.filter((s) => s.status === "published").length,
      inReview: rows.filter((s) => s.status === "review").length,
      drafts: rows.filter((s) => s.status === "draft").length,
      episodes: count("SELECT COUNT(*) FROM episodes e JOIN series s ON s.id = e.series_id WHERE s.creator_id = ?", cid),
      views30: count(
        "SELECT COUNT(*) FROM events e JOIN series s ON s.id = e.series_id WHERE s.creator_id = ? AND e.name='play_start' AND e.ts > ?",
        cid, since30
      ),
      earnings30: earnings.net / 100,
      gross30: earnings.gross / 100,
    },
    series: seriesListDTO(rows),
    topSeries: all(
      `SELECT s.id, s.title, s.views, s.cover_url,
              (SELECT COUNT(*) FROM events e WHERE e.series_id = s.id AND e.name='play_start' AND e.ts > ?) AS plays30,
              (SELECT COALESCE(SUM(l.net_cents),0) FROM ledger l WHERE l.series_id = s.id AND l.ts > ?) AS net30
       FROM series s WHERE s.creator_id = ? ORDER BY s.views DESC LIMIT 8`,
      since30, since30, cid
    ),
  });
});

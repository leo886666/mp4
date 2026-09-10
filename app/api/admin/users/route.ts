import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listUsers, toPublic } from "@/lib/server/repo/users";
import { cohorts, dailySeries } from "@/lib/server/repo/stats";
import { count } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requirePerm("users.read");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listUsers({
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    vip: (url.searchParams.get("vip") as "1" | "0" | "") ?? "",
    sort: url.searchParams.get("sort") ?? undefined,
    limit: p.perPage,
    offset: p.offset,
  });
  const now = Date.now();
  return ok({
    ...paged(rows.map((u) => ({ ...toPublic(u), lastSeenAt: u.last_seen_at, country: u.country, channel: u.channel })), total, p),
    summary: {
      total: count("SELECT COUNT(*) FROM users"),
      vip: count("SELECT COUNT(*) FROM users WHERE vip_until > ?", now),
      new7d: count("SELECT COUNT(*) FROM users WHERE created_at > ?", now - 7 * 86400_000),
      suspended: count("SELECT COUNT(*) FROM users WHERE status = 'suspended'"),
      creators: count("SELECT COUNT(*) FROM creators"),
    },
    cohorts: cohorts(8),
    daily: dailySeries(60),
  });
});

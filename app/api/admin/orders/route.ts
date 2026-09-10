import { ok, paged, paging, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { listOrders, netCents } from "@/lib/server/repo/commerce";
import { count } from "@/lib/server/db";
import { dailySeries, kpis, paymentMethods, planMix } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  await requirePerm("orders.read");
  const url = new URL(req.url);
  const p = paging(url, 25);
  const { rows, total } = listOrders({
    q: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    kind: url.searchParams.get("kind") ?? undefined,
    limit: p.perPage,
    offset: p.offset,
  });
  return ok({
    ...paged(
      rows.map((o) => ({
        id: o.id,
        user: { id: o.user_id, name: o.user_name, email: o.user_email },
        kind: o.kind,
        title: o.title,
        amount: netCents(o) / 100,
        discount: o.discount_cents / 100,
        status: o.status,
        gateway: o.gateway,
        country: o.country,
        createdAt: o.created_at,
        paidAt: o.paid_at,
      })),
      total,
      p
    ),
    kpis: kpis(),
    daily: dailySeries(60),
    planMix: planMix(),
    methods: paymentMethods(),
    summary: {
      paid: count("SELECT COUNT(*) FROM orders WHERE status='paid'"),
      pending: count("SELECT COUNT(*) FROM orders WHERE status='pending'"),
      refunded: count("SELECT COUNT(*) FROM orders WHERE status='refunded'"),
      grossCents: count("SELECT COALESCE(SUM(amount_cents - discount_cents),0) FROM orders WHERE status='paid'"),
      refundedCents: count("SELECT COALESCE(SUM(amount_cents),0) FROM refunds"),
    },
  });
});

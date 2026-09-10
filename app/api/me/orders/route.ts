import { ok, paged, paging, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { listOrders } from "@/lib/server/repo/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = requireUser("site");
  const p = paging(new URL(req.url), 20);
  const { rows, total } = listOrders({ userId: user.id, limit: p.perPage, offset: p.offset });
  return ok(
    paged(
      rows.map((o) => ({
        id: o.id,
        title: o.title,
        kind: o.kind,
        amount: (o.amount_cents - o.discount_cents) / 100,
        currency: o.currency,
        status: o.status,
        gateway: o.gateway,
        createdAt: o.created_at,
        paidAt: o.paid_at,
      })),
      total,
      p
    )
  );
});

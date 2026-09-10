import { body, num, ok, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { refundOrder } from "@/lib/server/services/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request, { params }: { params: { id: string } }) => {
  const operator = requirePerm("orders.refund");
  const data = await body(req).catch(() => ({}) as any);
  const reason = str(data.reason, "reason", { optional: true, max: 200 }) || "Console refund";
  const amount = data.amount !== undefined ? Math.round(num(data.amount, "amount", { min: 0.01 }) * 100) : undefined;
  const order = await refundOrder(params.id, operator.id, reason, amount);
  return ok({ order: { id: order.id, status: order.status } });
});

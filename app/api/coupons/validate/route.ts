import { body, ok, route, str } from "@/lib/server/http";
import { getPlan, validateCoupon } from "@/lib/server/repo/commerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = route(async (req: Request) => {
  const data = await body(req);
  const code = str(data.code, "code", { max: 40 }).toUpperCase();
  const planId = str(data.planId, "planId", { optional: true }) || null;
  const plan = planId ? getPlan(planId) : null;
  const result = validateCoupon(code, planId, plan?.price_cents ?? 0);
  return ok(result.valid ? { ...result, discount: result.discountCents / 100 } : result);
});

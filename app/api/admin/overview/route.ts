import { ok, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { cohorts, dailySeries, funnel, geoBreakdown, kpis, overviewCounts, paymentMethods, planMix } from "@/lib/server/repo/stats";
import { queueDepth, recentJobs } from "@/lib/server/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  requirePerm("console.view");
  const days = Math.min(180, Math.max(7, parseInt(new URL(req.url).searchParams.get("days") || "90", 10)));
  return ok({
    kpis: kpis(),
    counts: overviewCounts(),
    daily: dailySeries(days),
    funnel: funnel(days),
    planMix: planMix(),
    geo: geoBreakdown(),
    paymentMethods: paymentMethods(),
    cohorts: cohorts(8),
    jobs: { depth: queueDepth(), recent: recentJobs(8) },
  });
});

import { ok, route } from "@/lib/server/http";
import { listPlans, toPlan } from "@/lib/server/repo/commerce";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => ok({ plans: listPlans().map(toPlan), gateway: env.gateway }));

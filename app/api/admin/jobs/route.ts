import { body, ok, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { enqueue, queueDepth, recentJobs, wake } from "@/lib/server/jobs";
import { all } from "@/lib/server/db";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePerm("console.view");
  return ok({
    depth: queueDepth(),
    recent: recentJobs(30),
    media: all("SELECT status, COUNT(*) AS n FROM media_assets GROUP BY status"),
  });
});

export const POST = route(async (req: Request) => {
  const operator = await requirePerm("content.write");
  const data = await body(req).catch(() => ({}) as any);
  const kind = str(data.kind, "kind", { optional: true }) || "rollup";
  const id = enqueue(kind as any, data.payload ?? {});
  wake();
  audit({ actorId: operator.id, actorName: operator.name, action: "job.enqueue", targetType: "job", targetId: id, detail: { kind } });
  return ok({ id, kind });
});

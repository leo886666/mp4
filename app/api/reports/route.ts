import { body, ok, oneOf, route, str } from "@/lib/server/http";
import { optionalUser } from "@/lib/server/session";
import { createReport } from "@/lib/server/repo/engagement";
import { notify } from "@/lib/server/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TARGETS = ["series", "episode", "comment", "user"] as const;

export const POST = route(async (req: Request) => {
  const user = optionalUser("site");
  const data = await body(req);
  const id = createReport({
    reporterId: user?.id ?? null,
    targetType: oneOf(data.targetType, "targetType", TARGETS),
    targetId: str(data.targetId, "targetId"),
    reason: str(data.reason, "reason", { max: 80 }),
    detail: str(data.detail, "detail", { optional: true, max: 800 }),
  });
  if (user) notify({ userId: user.id, kind: "report", title: "Report received", body: "Our moderation team will review it shortly." });
  return ok({ id });
});

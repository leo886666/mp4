import { body, notFound, num, ok, oneOf, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { patchCampaign } from "@/lib/server/repo/ops";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const PATCH = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const operator = await requirePerm("campaigns.write");
  const data = await body(req);
  const patch: Record<string, any> = {};
  if (data.status !== undefined) patch.status = oneOf(data.status, "status", ["running", "paused", "ended"] as const);
  if (data.spend !== undefined) patch.spend_cents = Math.round(num(data.spend, "spend", { min: 0 }) * 100);
  if (data.installs !== undefined) patch.installs = num(data.installs, "installs", { min: 0 });
  if (data.name !== undefined) patch.name = str(data.name, "name", { max: 80 });
  const campaign = patchCampaign(params.id, patch);
  if (!campaign) throw notFound("Campaign not found");
  audit({ actorId: operator.id, actorName: operator.name, action: "campaign.update", targetType: "campaign", targetId: params.id, detail: patch });
  return ok({ campaign });
});

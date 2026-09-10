import { body, num, ok, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { createCampaign } from "@/lib/server/repo/ops";
import { campaignRows } from "@/lib/server/repo/stats";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  requirePerm("console.view");
  const rows = campaignRows().map((c: any) => {
    const spend = Number(c.spend_cents);
    const revenue = Number(c.revenue_cents);
    const installs = Number(c.installs) || Number(c.users) || 0;
    return {
      id: c.id,
      channel: c.channel,
      name: c.name,
      status: c.status,
      spend: spend / 100,
      installs,
      users: Number(c.users),
      payers: Number(c.payers),
      revenue: revenue / 100,
      cpi: installs ? spend / 100 / installs : 0,
      arpu: Number(c.users) ? revenue / 100 / Number(c.users) : 0,
      roi: spend ? Math.round(((revenue - spend) / spend) * 100) : null,
      startedAt: c.started_at,
    };
  });
  return ok({
    items: rows,
    totals: {
      spend: rows.reduce((a, r) => a + r.spend, 0),
      revenue: rows.reduce((a, r) => a + r.revenue, 0),
      installs: rows.reduce((a, r) => a + r.installs, 0),
    },
  });
});

export const POST = route(async (req: Request) => {
  const operator = requirePerm("campaigns.write");
  const data = await body(req);
  const campaign = createCampaign({
    channel: str(data.channel, "channel", { max: 40 }),
    name: str(data.name, "name", { max: 80 }),
    spendCents: Math.round(num(data.spend, "spend", { optional: true, def: 0, min: 0 }) * 100),
    installs: num(data.installs, "installs", { optional: true, def: 0, min: 0 }),
    utm: str(data.utm, "utm", { optional: true, max: 80 }),
  });
  audit({ actorId: operator.id, actorName: operator.name, action: "campaign.create", targetType: "campaign", targetId: campaign.id, detail: { name: campaign.name } });
  return ok({ campaign });
});

import { body, ok, route } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { allSettings, SETTING_DEFAULTS, setSetting } from "@/lib/server/repo/ops";
import { audit } from "@/lib/server/audit";
import { env } from "@/lib/server/env";
import { gatewayIds } from "@/lib/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePerm("console.view");
  return ok({
    settings: allSettings(),
    defaults: SETTING_DEFAULTS,
    runtime: {
      storageDriver: env.storageDriver,
      cdn: env.cdnBase || null,
      gateway: env.gateway,
      gateways: gatewayIds(),
      ladder: env.ladder,
      dataDir: env.dataDir,
      siteUrl: env.siteUrl,
    },
  });
});

export const PATCH = route(async (req: Request) => {
  const operator = await requirePerm("settings.write");
  const data = await body<Record<string, unknown>>(req);
  const changed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!(key in SETTING_DEFAULTS)) continue;
    setSetting(key, value, operator.id);
    changed[key] = value;
  }
  audit({ actorId: operator.id, actorName: operator.name, action: "settings.update", targetType: "settings", detail: changed });
  return ok({ settings: allSettings(), changed });
});

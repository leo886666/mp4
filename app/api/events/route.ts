import { body, ok, route } from "@/lib/server/http";
import { optionalUser } from "@/lib/server/session";
import { track } from "@/lib/server/repo/stats";
import { tx } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "install", "sign_up", "session_start", "play_start", "play_complete",
  "paywall_view", "checkout_started", "purchase", "favorite", "share",
  "comment", "series_view", "search", "rail_click",
]);

/** Batched client telemetry — the same table the ops console reads. */
export const POST = route(async (req: Request) => {
  const user = await optionalUser("site");
  const data = await body<{ events?: any[] }>(req);
  const events = Array.isArray(data.events) ? data.events.slice(0, 50) : [];
  let stored = 0;
  tx(() => {
    for (const e of events) {
      if (!e || typeof e.name !== "string" || !ALLOWED.has(e.name)) continue;
      track(e.name, {
        userId: user?.id ?? null,
        seriesId: typeof e.seriesId === "string" ? e.seriesId : null,
        episodeId: typeof e.episodeId === "string" ? e.episodeId : null,
        value: typeof e.value === "number" ? e.value : 0,
        props: typeof e.props === "object" && e.props ? e.props : {},
      });
      stored++;
    }
  });
  return ok({ stored });
});

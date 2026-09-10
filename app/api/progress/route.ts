import { body, notFound, num, ok, route, str } from "@/lib/server/http";
import { optionalUser } from "@/lib/server/session";
import { getEpisode } from "@/lib/server/repo/catalog";
import { saveProgress } from "@/lib/server/repo/engagement";
import { track } from "@/lib/server/repo/stats";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Heartbeat from the player. No session => nothing stored, still 200. */
export const POST = route(async (req: Request) => {
  const user = optionalUser("site");
  const data = await body(req);
  const episodeId = str(data.episodeId, "episodeId");
  const positionS = num(data.positionS, "positionS", { min: 0 });
  const durationS = num(data.durationS, "durationS", { min: 0, optional: true });
  const completed = !!data.completed;

  if (!user) return ok({ stored: false });

  const episode = getEpisode(episodeId);
  if (!episode) throw notFound("Episode not found");

  saveProgress({ userId: user.id, episodeId, seriesId: episode.series_id, positionS, durationS, completed });
  if (completed) track("play_complete", { userId: user.id, seriesId: episode.series_id, episodeId, value: durationS });

  return ok({ stored: true });
});

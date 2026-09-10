import { notFound, ok, route } from "@/lib/server/http";
import { getSeries, listEpisodes } from "@/lib/server/repo/catalog";
import { episodeDTO } from "@/lib/server/dto";
import { optionalUser } from "@/lib/server/session";
import { decideAccess } from "@/lib/server/entitlements";
import { progressForSeries } from "@/lib/server/repo/engagement";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const series = getSeries(params.id);
  if (!series) throw notFound("Series not found");
  const user = optionalUser("site");
  const progress = user ? new Map(progressForSeries(user.id, series.id).map((p) => [p.episode_id, p])) : new Map();
  return ok({
    episodes: listEpisodes(series.id).map((e) => {
      const access = decideAccess(user, series, e);
      const p = progress.get(e.id);
      return {
        ...episodeDTO(e, series.cover_url),
        locked: !access.allowed,
        requires: access.requires,
        progress: p ? { positionS: p.position_s, durationS: p.duration_s, completed: !!p.completed } : null,
      };
    }),
  });
});

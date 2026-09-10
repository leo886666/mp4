import { ok, paged, paging, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { clearHistory, historyFor, removeHistory } from "@/lib/server/repo/engagement";
import { coverOr } from "@/lib/placeholders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const user = await requireUser("site");
  const url = new URL(req.url);
  const p = paging(url, 30);
  const { rows, total } = historyFor(user.id, p.perPage, p.offset);
  return ok(
    paged(
      rows.map((r: any) => ({
        seriesId: r.series_id,
        episodeId: r.episode_id,
        title: r.series_title,
        cover: coverOr(r.cover_url, r.series_id),
        episodeN: r.episode_n,
        episodeTitle: r.episode_title,
        episodes: r.episode_count,
        positionS: r.position_s,
        durationS: r.duration_s,
        percent: r.duration_s ? Math.min(100, Math.round((r.position_s / r.duration_s) * 100)) : 0,
        completed: !!r.completed,
        updatedAt: r.updated_at,
      })),
      total,
      p
    )
  );
});

export const DELETE = route(async (req: Request) => {
  const user = await requireUser("site");
  const episodeId = new URL(req.url).searchParams.get("episodeId");
  if (episodeId) removeHistory(user.id, episodeId);
  else clearHistory(user.id);
  return ok({ cleared: episodeId ? 1 : "all" });
});

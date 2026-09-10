import { notFound } from "next/navigation";
import { PlayerClient } from "./player-client";
import { titleView } from "@/lib/server/services/views";
import { optionalUser } from "@/lib/server/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Highest-numbered episode with progress; roll forward if it's finished. */
function resumeEpisode(episodes: { n: number; locked?: boolean; progress?: { completed: boolean } | null }[]): number {
  const watched = episodes.filter((e) => e.progress);
  if (!watched.length) return episodes.find((e) => !e.locked)?.n ?? episodes[0]?.n ?? 1;
  const last = watched[watched.length - 1];
  if (last.progress?.completed) {
    const next = episodes.find((e) => e.n === last.n + 1);
    if (next) return next.n;
  }
  return last.n;
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const user = await optionalUser("site");
  let view;
  try {
    view = titleView(id, user);
  } catch {
    notFound();
  }
  // No ?ep= (a poster tapped on Home or History) → resume where they stopped.
  const startEp = query.ep
    ? Math.max(1, parseInt(query.ep, 10) || 1)
    : resumeEpisode(view!.episodes);
  return (
    <PlayerClient
      series={view!.series}
      episodes={view!.episodes}
      startEp={startEp}
      vip={!!view!.me?.vip}
      signedIn={!!user}
    />
  );
}

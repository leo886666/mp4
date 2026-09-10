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

export default function WatchPage({ params, searchParams }: { params: { id: string }; searchParams: { ep?: string } }) {
  const user = optionalUser("site");
  let view;
  try {
    view = titleView(params.id, user);
  } catch {
    notFound();
  }
  // No ?ep= (a poster tapped on Home or History) → resume where they stopped.
  const startEp = searchParams.ep
    ? Math.max(1, parseInt(searchParams.ep, 10) || 1)
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

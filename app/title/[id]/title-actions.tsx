"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Share2, Play, ShieldCheck } from "@/components/icons";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, track } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export function TitleActions({
  seriesId,
  firstEpisode,
  resumeEpisode,
  initialFavorite,
}: {
  seriesId: string;
  firstEpisode: number;
  resumeEpisode: { n: number; positionS: number } | null;
  initialFavorite: boolean;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const [favorite, setFavorite] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (m: string) => {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  };

  async function toggleFavorite() {
    if (!user) return router.push(`/register?next=/title/${seriesId}`);
    setBusy(true);
    try {
      const res = await api.post<{ favorite: boolean }>(`/api/series/${seriesId}/favorite`);
      setFavorite(res.favorite);
      flash(res.favorite ? "Added to your list" : "Removed from your list");
    } catch {
      flash("Couldn't update your list");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/title/${seriesId}`;
    track("share", { seriesId });
    if (navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        /* user dismissed */
      }
    }
    await navigator.clipboard?.writeText(url).catch(() => {});
    flash("Link copied");
  }

  async function report() {
    const reason = window.prompt("What's wrong with this series?");
    if (!reason) return;
    await api.post("/api/reports", { targetType: "series", targetId: seriesId, reason }).catch(() => {});
    flash("Report sent to moderation");
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <Button href={`/watch/${seriesId}?ep=${resumeEpisode?.n ?? firstEpisode}`} size="lg" className="min-w-[190px]">
        <Play className="w-4 h-4 fill-white" />
        {resumeEpisode ? `Resume EP ${resumeEpisode.n}` : `Watch EP ${firstEpisode} — free`}
      </Button>
      <Button variant="secondary" size="lg" onClick={toggleFavorite} disabled={busy}>
        <Heart className={cn("w-4 h-4", favorite && "fill-ember text-ember")} strokeWidth={1.8} />
        {favorite ? "In your list" : "Add to list"}
      </Button>
      <Button variant="secondary" size="lg" onClick={share}>
        <Share2 className="w-4 h-4" strokeWidth={1.8} />
      </Button>
      <button
        onClick={report}
        className="h-[52px] px-4 inline-flex items-center gap-2 text-[13px] text-ink-faint hover:text-ink-mute transition-colors"
      >
        <ShieldCheck className="w-4 h-4" strokeWidth={1.7} />
        Report
      </button>
      {toast && (
        <span className="text-[12.5px] font-medium text-ink-mute animate-fade-up">{toast}</span>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Play, Pause, Volume2, VolumeX, Lock, List, Crown,
  ChevronUp, Heart, Share2, Loader2, Settings, AlertTriangle,
} from "@/components/icons";
import { Button } from "@/components/ui";
import { api, ApiError, track } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { Drama, Episode } from "@/lib/types";

interface PlaySource { type: string; url: string; label: string }
interface PlayResponse {
  episode: { id: string; n: number; title: string; durationS: number; access: string; poster: string };
  series: { id: string; title: string; cover: string; episodes: number };
  access: { allowed: boolean; reason: string };
  media: { id: string | null; status: string; poster?: string | null; variants?: number[] };
  sources: PlaySource[];
  token: string;
  next: { id: string; n: number; title: string } | null;
  prev: { id: string; n: number; title: string } | null;
  progress: { positionS: number; durationS: number; completed: boolean } | null;
  danmaku: { t: number; body: string; color: string }[];
}

interface Bullet { key: number; body: string; color: string; lane: number }

const fmt = (s: number) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, "0")}`;

export function PlayerClient({
  series, episodes, startEp, vip, signedIn,
}: {
  series: Drama;
  episodes: Episode[];
  startEp: number;
  vip: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const bulletKey = useRef(0);
  const firedDanmaku = useRef<Set<number>>(new Set());

  const [epN, setEpN] = useState(() => (episodes.some((e) => e.n === startEp) ? startEp : episodes[0]?.n ?? 1));
  const episode = useMemo(() => episodes.find((e) => e.n === epN) ?? episodes[0], [episodes, epN]);

  const [play, setPlay] = useState<PlayResponse | null>(null);
  const [locked, setLocked] = useState<{ requires: string; priceCents: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [showEpisodes, setShowEpisodes] = useState(false);
  const [liked, setLiked] = useState(false);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [danmakuOn, setDanmakuOn] = useState(true);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const [quality, setQuality] = useState<number>(-1);
  const [showQuality, setShowQuality] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  /* ------------------------------ load episode ---------------------------- */

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLocked(null);
    setPlay(null);
    setPlaybackError(null);
    setTime(0);
    firedDanmaku.current = new Set();
    setBullets([]);

    (async () => {
      if (!episode) return;
      try {
        const res = await api.get<PlayResponse>(`/api/episodes/${episode.id}/play`);
        if (cancelled) return;
        setPlay(res);
        setDuration(res.episode.durationS || res.progress?.durationS || 0);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 402) {
          setLocked({ requires: e.details?.requires ?? "vip", priceCents: e.details?.priceCents ?? 99 });
          track("paywall_view", { seriesId: series.id, episodeId: episode.id });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [episode, series.id]);

  /* -------------------------------- attach hls ---------------------------- */

  useEffect(() => {
    const video = videoRef.current;
    const hls = play?.sources.find((s) => s.type === "hls");
    const mp4 = play?.sources.find((s) => s.type === "mp4");
    if (!video || !play) return;

    let disposed = false;
    hlsRef.current?.destroy?.();
    hlsRef.current = null;

    (async () => {
      if (hls && video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = hls.url; // Safari plays HLS natively
      } else if (hls) {
        const Hls = (await import("hls.js")).default;
        if (disposed) return;
        if (Hls.isSupported()) {
          const instance = new Hls({ enableWorker: true, lowLatencyMode: false, maxBufferLength: 30 });
          instance.loadSource(hls.url);
          instance.attachMedia(video);
          // Recover what is recoverable; surface what is not, rather than
          // leaving the viewer on a spinner that never resolves.
          instance.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
            if (!data?.fatal) return;
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
              instance.startLoad();
              return;
            }
            if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
              instance.recoverMediaError();
              return;
            }
            if (mp4) {
              video.src = mp4.url;
              return;
            }
            instance.destroy();
            hlsRef.current = null;
            setPlaybackError(
              data.details === "bufferIncompatibleCodecsError" || data.details === "manifestIncompatibleCodecsError"
                ? "This browser can't decode H.264 video."
                : "Playback failed. Check your connection and try again."
            );
          });
          hlsRef.current = instance;
        } else if (mp4) {
          video.src = mp4.url;
        } else {
          setPlaybackError("This browser doesn't support streaming playback.");
        }
      } else if (mp4) {
        video.src = mp4.url;
      } else if (play.media.status !== "ready") {
        setPlaybackError(
          play.media.status === "failed"
            ? "This episode failed to process. We're on it."
            : "This episode is still being prepared — check back in a minute."
        );
      }

      const resume = play.progress?.positionS ?? 0;
      if (resume > 3 && resume < (play.episode.durationS || 1e9) - 5) {
        const seek = () => {
          video.currentTime = resume;
          video.removeEventListener("loadedmetadata", seek);
        };
        video.addEventListener("loadedmetadata", seek);
      }
      void video.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    })();

    return () => {
      disposed = true;
      hlsRef.current?.destroy?.();
      hlsRef.current = null;
    };
  }, [play]);

  /* ------------------------------ progress sync --------------------------- */

  const sync = useCallback(
    (completed = false) => {
      const video = videoRef.current;
      if (!video || !episode || !signedIn || !play) return;
      void api
        .post("/api/progress", {
          episodeId: episode.id,
          positionS: Math.floor(video.currentTime),
          durationS: Math.floor(video.duration || play.episode.durationS || 0),
          completed,
        })
        .catch(() => {});
    },
    [episode, signedIn, play]
  );

  useEffect(() => {
    const t = setInterval(() => playing && sync(), 8000);
    const onHide = () => sync();
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(t);
      window.removeEventListener("pagehide", onHide);
      sync();
    };
  }, [sync, playing]);

  /* --------------------------------- danmaku ------------------------------ */

  useEffect(() => {
    if (!bullets.length) return;
    const t = setTimeout(() => setBullets((b) => b.slice(1)), 900);
    return () => clearTimeout(t);
  }, [bullets]);

  const pushBullet = useCallback((body: string, color = "#ffffff") => {
    bulletKey.current += 1;
    setBullets((b) => [...b.slice(-14), { key: bulletKey.current, body, color, lane: bulletKey.current % 5 }]);
  }, []);

  function onTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    setTime(video.currentTime);
    if (video.duration && Number.isFinite(video.duration)) setDuration(video.duration);
    if (!danmakuOn || !play) return;
    const ms = Math.floor(video.currentTime * 1000);
    for (const d of play.danmaku) {
      if (d.t <= ms && d.t > ms - 500 && !firedDanmaku.current.has(d.t)) {
        firedDanmaku.current.add(d.t);
        pushBullet(d.body, d.color);
      }
    }
  }

  async function sendDanmaku() {
    const text = draft.trim();
    if (!text || !episode) return;
    setDraft("");
    setComposing(false);
    pushBullet(text, "#ffd479");
    if (!signedIn) return router.push(`/register?next=/watch/${series.id}?ep=${epN}`);
    await api.post(`/api/episodes/${episode.id}/danmaku`, { tMs: Math.floor((videoRef.current?.currentTime ?? 0) * 1000), body: text }).catch(() => {});
  }

  /* -------------------------------- navigation ---------------------------- */

  const goTo = useCallback(
    (n: number) => {
      const target = episodes.find((e) => e.n === n);
      if (!target) return;
      sync();
      setEpN(n);
      window.history.replaceState(null, "", `/watch/${series.id}?ep=${n}`);
    },
    [episodes, series.id, sync]
  );

  function onEnded() {
    sync(true);
    track("play_complete", { seriesId: series.id, episodeId: episode?.id });
    if (play?.next) goTo(play.next.n);
  }

  // vertical swipe = next / previous episode (the short-drama gesture)
  const touchStart = useRef(0);
  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dy = touchStart.current - e.changedTouches[0].clientY;
    if (Math.abs(dy) < 70) return;
    goTo(dy > 0 ? epN + 1 : epN - 1);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (composing) return;
      const video = videoRef.current;
      if (e.key === " ") { e.preventDefault(); togglePlay(); }
      if (e.key === "ArrowRight" && video) video.currentTime += 5;
      if (e.key === "ArrowLeft" && video) video.currentTime -= 5;
      if (e.key === "ArrowDown") goTo(epN + 1);
      if (e.key === "ArrowUp") goTo(epN - 1);
      if (e.key === "Escape") setShowEpisodes(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function togglePlay() {
    const video = videoRef.current;
    if (!video || locked) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function setLevel(level: number) {
    setQuality(level);
    setShowQuality(false);
    if (hlsRef.current) hlsRef.current.currentLevel = level;
  }

  async function buyEpisode() {
    if (!signedIn) return router.push(`/register?next=/watch/${series.id}?ep=${epN}`);
    if (!episode) return;
    setPurchasing(true);
    try {
      const res = await api.post<{ checkoutUrl: string }>("/api/orders", { kind: "episode", refId: episode.id });
      router.push(res.checkoutUrl);
    } catch {
      setPurchasing(false);
    }
  }

  const progressPct = duration ? Math.min(100, (time / duration) * 100) : 0;
  const poster = play?.episode.poster || episode?.poster || series.cover;

  return (
    <div className="min-h-screen bg-black flex items-stretch lg:items-center justify-center">
      <div className="w-full lg:max-w-[420px] lg:my-6 relative">
        <div
          className="relative aspect-[9/16] lg:aspect-[9/19] overflow-hidden lg:rounded-[24px] bg-neutral-900 select-none"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* poster underlay — the frame is never empty, even before the first byte */}
          <Image
            src={poster}
            alt={series.title}
            fill
            sizes="(max-width:1024px) 100vw, 420px"
            className={cn("object-cover", (locked || !play) && "blur-sm brightness-[0.55]")}
            priority
          />

          {play && !locked && (
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover bg-black"
              playsInline
              muted={muted}
              poster={poster}
              onTimeUpdate={onTimeUpdate}
              onPlay={() => { setPlaying(true); track("play_start", { seriesId: series.id, episodeId: episode?.id }); }}
              onPause={() => setPlaying(false)}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onEnded={onEnded}
            />
          )}

          <button className="absolute inset-0" aria-label={playing ? "Pause" : "Play"} onClick={togglePlay} />

          {/* danmaku */}
          {danmakuOn && (
            <div className="absolute inset-x-0 top-[18%] h-[42%] pointer-events-none overflow-hidden">
              {bullets.map((b) => (
                <span
                  key={b.key}
                  className="absolute right-0 whitespace-nowrap text-[13px] font-medium drop-shadow-[0_1px_2px_rgba(0,0,0,.8)] animate-[danmaku_7s_linear_forwards]"
                  style={{ top: `${b.lane * 20}%`, color: b.color }}
                >
                  {b.body}
                </span>
              ))}
            </div>
          )}

          {playbackError && !locked && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center bg-black/55 backdrop-blur-[2px]">
              <AlertTriangle className="w-7 h-7 text-white/80" strokeWidth={1.8} />
              <p className="text-white text-[14px] font-medium leading-relaxed">{playbackError}</p>
              <button
                onClick={() => { setPlaybackError(null); setEpN((n) => n); router.refresh(); }}
                className="mt-1 h-9 px-5 rounded-full bg-white/15 text-white text-[12.5px] font-semibold hover:bg-white/25 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
          {(loading || buffering) && !locked && !playbackError && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
            </span>
          )}
          {!playing && !loading && !locked && !playbackError && play && (
            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="w-16 h-16 rounded-full bg-black/45 backdrop-blur flex items-center justify-center">
                <Play className="w-7 h-7 fill-white text-white ml-1" />
              </span>
            </span>
          )}

          {/* top bar */}
          <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
            <button
              onClick={() => router.push(`/title/${series.id}`)}
              className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center hover:bg-black/55"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center min-w-0 px-2">
              <p className="text-white text-[13px] font-semibold truncate">{series.title}</p>
              <p className="text-white/60 text-[11px] mt-0.5">EP {epN} · {episode?.title}</p>
            </div>
            <button
              onClick={() => setShowEpisodes(true)}
              className="w-9 h-9 rounded-full bg-black/35 backdrop-blur text-white flex items-center justify-center hover:bg-black/55"
              aria-label="Episodes"
            >
              <List className="w-5 h-5" strokeWidth={1.8} />
            </button>
          </div>

          {/* side actions */}
          <div className="absolute right-3 bottom-32 flex flex-col gap-4">
            <button
              onClick={async () => {
                setLiked((l) => !l);
                if (episode) await api.post(`/api/episodes/${episode.id}/like`).catch(() => {});
              }}
              className="flex flex-col items-center gap-1 text-white/85"
              aria-label="Like"
            >
              <Heart className={cn("w-6 h-6", liked && "text-ember fill-ember")} strokeWidth={1.8} />
              <span className="text-[10px]">{liked ? "Liked" : "Like"}</span>
            </button>
            <Link href={`/title/${series.id}`} className="flex flex-col items-center gap-1 text-white/85">
              <Share2 className="w-6 h-6" strokeWidth={1.8} />
              <span className="text-[10px]">Series</span>
            </Link>
            <button
              onClick={() => setDanmakuOn((d) => !d)}
              className={cn("flex flex-col items-center gap-1", danmakuOn ? "text-white/85" : "text-white/35")}
              aria-label="Toggle bullet comments"
            >
              <List className="w-6 h-6" strokeWidth={1.8} />
              <span className="text-[10px]">Danmu</span>
            </button>
          </div>

          {/* bottom controls */}
          {!locked && (
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/75 to-transparent">
              {play?.next && (
                <p className="text-white text-[12px] font-medium mb-3">
                  Swipe up for EP {play.next.n} <ChevronUp className="w-3.5 h-3.5 inline animate-bounce" />
                </p>
              )}
              <div className="flex items-center gap-3 text-white">
                <button onClick={() => goTo(epN - 1)} disabled={!play?.prev} className="text-[12px] font-medium opacity-90 disabled:opacity-30">Prev</button>
                <button onClick={togglePlay} aria-label="Play/Pause">
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>
                <button onClick={() => goTo(epN + 1)} disabled={!play?.next} className="text-[12px] font-medium opacity-90 disabled:opacity-30">Next</button>
                <span className="text-[11px] tabular-nums opacity-80">{fmt(time)} / {fmt(duration)}</span>
                <div className="flex-1" />
                {!!play?.media.variants?.length && (
                  <div className="relative">
                    <button onClick={() => setShowQuality((s) => !s)} aria-label="Quality">
                      <Settings className="w-5 h-5" strokeWidth={1.8} />
                    </button>
                    {showQuality && (
                      <div className="absolute bottom-8 right-0 bg-black/85 backdrop-blur rounded-xl p-1.5 min-w-[92px]">
                        <button onClick={() => setLevel(-1)} className={cn("block w-full text-left px-3 py-1.5 rounded-lg text-[12px]", quality === -1 && "bg-white/15")}>Auto</button>
                        {play.media.variants!.map((h, i) => (
                          <button key={h} onClick={() => setLevel(i)} className={cn("block w-full text-left px-3 py-1.5 rounded-lg text-[12px]", quality === i && "bg-white/15")}>{h}p</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <button onClick={() => setMuted((m) => !m)} aria-label="Mute">
                  {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>
              <div
                className="mt-2.5 h-[3px] rounded-full bg-white/25 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const video = videoRef.current;
                  if (video && duration) video.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
                }}
              >
                <div className="h-full bg-white rounded-full" style={{ width: `${progressPct}%` }} />
              </div>

              {composing ? (
                <div className="mt-3 flex gap-2">
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendDanmaku()}
                    maxLength={60}
                    placeholder="Say something…"
                    className="flex-1 h-9 rounded-full bg-white/12 text-white placeholder:text-white/40 px-4 text-[13px] outline-none"
                  />
                  <button onClick={sendDanmaku} className="h-9 px-4 rounded-full bg-ember text-white text-[12.5px] font-semibold">Send</button>
                </div>
              ) : (
                <button
                  onClick={() => setComposing(true)}
                  className="mt-3 w-full h-9 rounded-full bg-white/10 text-white/60 text-[12.5px] text-left px-4 hover:bg-white/15 transition-colors"
                >
                  Say something…
                </button>
              )}
            </div>
          )}

          {/* paywall */}
          {locked && (
            <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/95 via-black/75 to-transparent">
              <div className="text-white">
                <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-widest text-gold">
                  <Lock className="w-3.5 h-3.5" /> PREVIEW ENDED
                </p>
                <h3 className="font-display text-[22px] leading-snug mt-2">
                  {locked.requires === "login" ? `Sign in to watch EP ${epN}` : `Episode ${epN} is locked`}
                </h3>
                <p className="text-[13px] text-white/70 mt-1.5 leading-relaxed">
                  {locked.requires === "purchase"
                    ? `Unlock this episode for $${(locked.priceCents / 100).toFixed(2)}, or take VIP and unlock the entire catalog.`
                    : `Unlock all ${series.episodes} episodes of ${series.title} — plus every other series — with VESPER VIP.`}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  {locked.requires === "login" ? (
                    <Button href={`/register?next=/watch/${series.id}?ep=${epN}`} variant="gold" size="lg" className="flex-1">
                      Create a free account
                    </Button>
                  ) : locked.requires === "purchase" ? (
                    <>
                      <Button size="lg" className="flex-1" onClick={buyEpisode} disabled={purchasing}>
                        {purchasing ? "Opening…" : `Unlock $${(locked.priceCents / 100).toFixed(2)}`}
                      </Button>
                      <Button href="/vip" variant="gold" size="lg">
                        <Crown className="w-4 h-4 fill-white" /> VIP
                      </Button>
                    </>
                  ) : (
                    <Button href="/vip" variant="gold" size="lg" className="flex-1">
                      <Crown className="w-4 h-4 fill-white" />
                      Unlock with VIP
                    </Button>
                  )}
                  <Button variant="ghost" size="lg" className="text-white/80 hover:bg-white/10" onClick={() => goTo(episodes.find((e) => !e.locked)?.n ?? 1)}>
                    Back to free
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* episodes sheet */}
        {showEpisodes && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowEpisodes(false)} />
            <div className="relative bg-paper w-full lg:w-[420px] rounded-t-[20px] lg:rounded-[20px] max-h-[70vh] flex flex-col animate-sheet-up">
              <div className="px-5 pt-5 pb-4 hairline-b">
                <h3 className="font-display text-xl">{series.title}</h3>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  {episodes.filter((e) => !e.locked).length} unlocked · {series.episodes} episodes
                </p>
              </div>
              <div className="overflow-y-auto p-3">
                {episodes.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { goTo(e.n); setShowEpisodes(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                      e.n === epN ? "bg-wash" : "hover:bg-wash/70"
                    )}
                  >
                    <span className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold shrink-0",
                      e.n === epN ? "bg-inv text-white" : "bg-wash ring-1 ring-line"
                    )}>
                      {e.locked ? <Lock className="w-3.5 h-3.5 text-gold" /> : e.n}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[13px] truncate", e.n === epN && "font-semibold")}>{e.title}</span>
                      <span className="block text-[11px] text-ink-mute mt-0.5">
                        {e.duration || "—"} · {e.locked ? (e.requires === "purchase" ? `$${e.price.toFixed(2)}` : "VIP") : "Free"}
                      </span>
                    </span>
                    {e.n === epN && <span className="w-1.5 h-1.5 rounded-full bg-ember shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

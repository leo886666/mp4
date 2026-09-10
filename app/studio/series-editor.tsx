"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Lock, Plus, Trash2, Upload, X, Play, ChevronRight } from "@/components/icons";
import { Button, Badge, Segmented } from "@/components/ui";
import { api, uploadFile, waitForMedia } from "@/lib/client/api";
import { cn } from "@/lib/utils";
import type { Drama, Episode, Genre } from "@/lib/types";

const STATUS_TONE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  review: "bg-gold-tint text-gold",
  draft: "bg-wash text-ink-mute",
  rejected: "bg-ember-tint text-ember",
  offline: "bg-wash text-ink-faint",
};

export function SeriesEditor({
  series, genres, onChanged, onClose,
}: {
  series: Drama;
  genres: Genre[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    title: series.title,
    synopsis: series.synopsis,
    genre: series.genre,
    tags: series.tags.join(", "),
    monetization: series.monetization ?? "vip",
    freeEpisodes: series.freeEpisodes,
    ppePrice: series.ppePrice ?? 0.99,
    ongoing: series.status === "Ongoing",
    cover: series.cover,
  });
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState<{ percent: number; label: string } | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const coverInput = useRef<HTMLInputElement>(null);

  async function loadEpisodes() {
    const res = await api.get<{ episodes: Episode[] }>(`/api/studio/series/${series.id}/episodes`);
    setEpisodes(res.episodes);
  }

  useEffect(() => {
    void loadEpisodes();
    // poll while anything is still transcoding
    const t = setInterval(async () => {
      const res = await api.get<{ episodes: Episode[] }>(`/api/studio/series/${series.id}/episodes`).catch(() => null);
      if (res) {
        setEpisodes(res.episodes);
        if (!res.episodes.some((e) => e.mediaStatus && e.mediaStatus !== "ready" && e.mediaStatus !== "failed")) clearInterval(t);
      }
    }, 4000);
    return () => clearInterval(t);
  }, [series.id]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/api/studio/series/${series.id}`, {
        ...form,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      setMessage("Saved");
      onChanged();
    } catch (e: any) {
      setMessage(e?.message ?? "Couldn't save");
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 2500);
    }
  }

  async function onCoverPicked(file: File) {
    setUploading({ percent: 0, label: "Uploading cover" });
    try {
      const res = await uploadFile(file, { kind: "image", onProgress: (p) => setUploading({ percent: p, label: "Uploading cover" }) });
      const url = res.url ?? form.cover;
      setForm((f) => ({ ...f, cover: url }));
      await api.patch(`/api/studio/series/${series.id}`, { cover: url });
      onChanged();
    } finally {
      setUploading(null);
    }
  }

  async function onVideoPicked(file: File) {
    setUploading({ percent: 0, label: "Uploading video" });
    try {
      const res = await uploadFile(file, { kind: "video", onProgress: (p) => setUploading({ percent: p, label: "Uploading video" }) });
      setUploading({ percent: 100, label: "Transcoding to HLS" });
      await api.post(`/api/studio/series/${series.id}/episodes`, { mediaId: res.mediaId });
      await loadEpisodes();
      void waitForMedia(res.mediaId, () => {}).then(loadEpisodes);
    } finally {
      setUploading(null);
    }
  }

  async function addPlaceholderEpisode() {
    await api.post(`/api/studio/series/${series.id}/episodes`, {});
    await loadEpisodes();
    onChanged();
  }

  async function removeEpisode(id: string) {
    await api.del(`/api/studio/episodes/${id}`);
    await loadEpisodes();
    onChanged();
  }

  async function submit() {
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/api/studio/series/${series.id}/submit`, {});
      setMessage("Submitted — the review team has it now");
      onChanged();
    } catch (e: any) {
      setMessage(e?.message ?? "Couldn't submit");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-paper w-full lg:w-[860px] rounded-t-[20px] lg:rounded-[20px] max-h-[92vh] lg:max-h-[88vh] flex flex-col animate-sheet-up overflow-hidden">
        <div className="px-5 sm:px-6 pt-5 pb-4 hairline-b flex items-start gap-4">
          <div className="relative w-[54px] h-[72px] rounded-lg overflow-hidden ring-1 ring-line shrink-0">
            <Image src={form.cover} alt="" fill sizes="54px" className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl truncate">{form.title}</h3>
            <p className="text-[12px] text-ink-mute mt-0.5 flex items-center gap-2">
              <span className={cn("h-5 px-2 inline-flex items-center rounded-full text-[10.5px] font-semibold", STATUS_TONE[series.publishState ?? "draft"])}>
                {series.publishState}
              </span>
              {episodes.length} episodes · {series.genreName}
            </p>
            {series.reviewNote && <p className="text-[12px] text-ember mt-1.5">Reviewer: {series.reviewNote}</p>}
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-wash flex items-center justify-center shrink-0" aria-label="Close">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
          {/* metadata */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-[12px] font-medium text-ink-mute">Title</span>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1.5 w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none transition-shadow"
              />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-ink-mute">Genre</span>
              <select
                value={form.genre}
                onChange={(e) => setForm({ ...form, genre: e.target.value })}
                className="mt-1.5 w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3 text-[14px] outline-none"
              >
                {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[12px] font-medium text-ink-mute">Synopsis</span>
              <textarea
                value={form.synopsis}
                onChange={(e) => setForm({ ...form, synopsis: e.target.value })}
                rows={3}
                className="mt-1.5 w-full rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 py-2.5 text-[14px] outline-none resize-none transition-shadow"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[12px] font-medium text-ink-mute">Tags (comma separated)</span>
              <input
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="Revenge, Slow Burn"
                className="mt-1.5 w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none transition-shadow"
              />
            </label>
          </div>

          {/* monetization */}
          <div className="rounded-2xl ring-1 ring-line p-5">
            <p className="text-[13px] font-semibold">Monetization</p>
            <p className="text-[12px] text-ink-mute mt-0.5 mb-4">How viewers pay for this series — the paywall enforces it server-side.</p>
            <Segmented
              options={[
                { id: "free", label: "Free" },
                { id: "vip", label: "VIP pool" },
                { id: "ppe", label: "Pay per episode" },
              ]}
              value={form.monetization}
              onChange={(id) => setForm({ ...form, monetization: id as any })}
            />
            <div className="grid sm:grid-cols-2 gap-4 mt-4">
              <label className="block">
                <span className="text-[12px] font-medium text-ink-mute">Free episodes</span>
                <input
                  type="number" min={0} max={30}
                  value={form.freeEpisodes}
                  onChange={(e) => setForm({ ...form, freeEpisodes: Number(e.target.value) })}
                  className="mt-1.5 w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none"
                />
              </label>
              {form.monetization === "ppe" && (
                <label className="block">
                  <span className="text-[12px] font-medium text-ink-mute">Price per episode (USD)</span>
                  <input
                    type="number" min={0} max={9.99} step={0.01}
                    value={form.ppePrice}
                    onChange={(e) => setForm({ ...form, ppePrice: Number(e.target.value) })}
                    className="mt-1.5 w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none"
                  />
                </label>
              )}
            </div>
            <p className="text-[11.5px] text-ink-faint mt-3">
              VIP pool pays out monthly by watch time. Pay-per-episode pays 70% of each unlock, attributed instantly.
            </p>
          </div>

          {/* artwork + episodes */}
          <div className="flex flex-wrap gap-3">
            <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onCoverPicked(e.target.files[0])} />
            <input ref={videoInput} type="file" accept="video/*" hidden onChange={(e) => e.target.files?.[0] && onVideoPicked(e.target.files[0])} />
            <Button variant="secondary" size="md" onClick={() => coverInput.current?.click()} disabled={!!uploading}>
              <Upload className="w-4 h-4" strokeWidth={1.9} /> Replace cover
            </Button>
            <Button size="md" onClick={() => videoInput.current?.click()} disabled={!!uploading}>
              <Plus className="w-4 h-4" strokeWidth={2.2} /> Upload episode video
            </Button>
            <Button variant="ghost" size="md" onClick={addPlaceholderEpisode} disabled={!!uploading}>
              Add empty episode
            </Button>
          </div>

          {uploading && (
            <div className="rounded-xl bg-wash ring-1 ring-line p-4">
              <p className="text-[12.5px] font-medium flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploading.label} — {uploading.percent}%
              </p>
              <div className="mt-2 h-1.5 rounded-full bg-line overflow-hidden">
                <div className="h-full bg-ember rounded-full transition-[width]" style={{ width: `${uploading.percent}%` }} />
              </div>
            </div>
          )}

          <div className="rounded-2xl ring-1 ring-line overflow-hidden">
            <div className="px-4 py-3 bg-wash flex items-center justify-between">
              <p className="text-[13px] font-semibold">Episodes ({episodes.length})</p>
              <p className="text-[11.5px] text-ink-faint">First {form.freeEpisodes} are free</p>
            </div>
            <div className="divide-y divide-line max-h-[320px] overflow-y-auto">
              {episodes.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-8 h-8 rounded-lg bg-wash ring-1 ring-line flex items-center justify-center text-[12px] font-semibold shrink-0">
                    {e.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium truncate">{e.title}</p>
                    <p className="text-[11.5px] text-ink-mute mt-0.5 flex items-center gap-1.5">
                      {e.access === "free" ? "Free" : e.access === "ppe" ? `$${e.price.toFixed(2)}` : "VIP"}
                      {" · "}
                      {e.hasMedia ? (
                        e.mediaStatus === "ready" ? (
                          <span className="text-emerald-600 inline-flex items-center gap-1"><Check className="w-3 h-3" strokeWidth={3} /> {e.duration} HLS</span>
                        ) : e.mediaStatus === "failed" ? (
                          <span className="text-ember">transcode failed</span>
                        ) : (
                          <span className="text-gold inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> {e.mediaStatus}</span>
                        )
                      ) : (
                        <span className="text-ink-faint">no video yet</span>
                      )}
                    </p>
                  </div>
                  {e.status !== "published" && <Badge tone="neutral">{e.status}</Badge>}
                  <button
                    onClick={() => removeEpisode(e.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-ember hover:bg-wash transition-colors shrink-0"
                    aria-label="Delete episode"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.8} />
                  </button>
                </div>
              ))}
              {!episodes.length && (
                <p className="px-4 py-8 text-center text-[13px] text-ink-faint">No episodes yet — upload your first video.</p>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-6 py-4 hairline-t flex items-center gap-3">
          {series.publishState === "published" ? (
            <Link href={`/title/${series.id}`} className="text-[13px] font-medium text-ink-mute hover:text-ink inline-flex items-center gap-1">
              View live page <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="text-[12.5px] text-ink-faint">{message ?? "Drafts are private until approved."}</span>
          )}
          {message && series.publishState === "published" && <span className="text-[12.5px] text-ink-mute">{message}</span>}
          <div className="flex-1" />
          <Button variant="secondary" size="md" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save changes
          </Button>
          {series.publishState !== "published" && series.publishState !== "review" && (
            <Button size="md" onClick={submit} disabled={saving || !episodes.some((e) => e.hasMedia)}>
              Submit for review
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

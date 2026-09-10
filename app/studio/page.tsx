"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, Loader2, Wallet, Film, TrendingUp, Eye, Upload, ChevronRight, Layers, Check,
} from "@/components/icons";
import { Avatar, Badge, Button, EmptyState, SectionHeader, Segmented } from "@/components/ui";
import { StatCard, AreaChart, BarChart } from "@/components/admin/charts";
import { SeriesEditor } from "./series-editor";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/client/api";
import { cn, money, formatViews } from "@/lib/utils";
import type { Drama, Genre } from "@/lib/types";

interface Overview {
  creator: { id: string; name: string; initials: string; role: string; followers: number; shareBps: number; balance: number };
  stats: { series: number; published: number; inReview: number; drafts: number; episodes: number; views30: number; earnings30: number; gross30: number };
  series: Drama[];
  topSeries: { id: string; title: string; views: number; cover_url: string; plays30: number; net30: number }[];
}

interface Earnings {
  balance: number;
  shareBps: number;
  last30: { gross: number; net: number; balance: number };
  lifetime: { gross: number; net: number; balance: number };
  daily: { d: string; net: number }[];
  ledger: any[];
  payouts: any[];
}

const STATUS_TONE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-700",
  review: "bg-gold-tint text-gold",
  draft: "bg-wash text-ink-mute",
  rejected: "bg-ember-tint text-ember",
  offline: "bg-wash text-ink-faint",
};

export default function StudioPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [editing, setEditing] = useState<Drama | null>(null);
  const [creating, setCreating] = useState(false);
  const [newSeries, setNewSeries] = useState({ title: "", genre: "romance", synopsis: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [ov, gs] = await Promise.all([
      api.get<Overview>("/api/studio/overview"),
      api.get<{ genres: Genre[] }>("/api/genres"),
    ]);
    setOverview(ov);
    setGenres(gs.genres);
    if (editing) setEditing(ov.series.find((s) => s.id === editing.id) ?? null);
  }, [editing]);

  useEffect(() => {
    if (!ready) return;
    if (!user) return;
    void load().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user]);

  useEffect(() => {
    if (tab === "earnings" && user) void api.get<Earnings>("/api/studio/earnings").then(setEarnings).catch(() => {});
  }, [tab, user]);

  async function create() {
    if (newSeries.title.trim().length < 2) return setError("Give the series a title");
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ series: Drama }>("/api/studio/series", newSeries);
      setCreating(false);
      setNewSeries({ title: "", genre: "romance", synopsis: "" });
      await load();
      setEditing(res.series);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't create the series");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    setBusy(true);
    try {
      await api.post("/api/studio/payouts", {});
      await api.get<Earnings>("/api/studio/earnings").then(setEarnings);
      await load();
    } catch (e: any) {
      setError(e?.message ?? "Withdrawal failed");
    } finally {
      setBusy(false);
    }
  }

  if (ready && !user) {
    return (
      <div className="mx-auto max-w-[520px] px-5 pt-16 pb-20 text-center animate-fade-up">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-inv items-center justify-center">
          <Film className="w-6 h-6 text-white" strokeWidth={1.8} />
        </span>
        <h1 className="font-display text-[28px] tracking-tight mt-5">Creator Studio</h1>
        <p className="text-[14px] text-ink-mute mt-2 leading-relaxed">
          Publish vertical series, set your paywall, and get paid 70% of every unlock. Sign in to open your studio.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          <Button href="/register?next=/studio" size="lg">Create an account</Button>
          <Button href="/login?next=/studio" variant="secondary" size="lg">Log in</Button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-ink-faint" />
      </div>
    );
  }

  const { creator, stats, series, topSeries } = overview;

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      {/* header */}
      <div className="flex items-center gap-4">
        <Avatar initials={creator.initials} size="lg" />
        <div className="min-w-0">
          <h1 className="font-display text-[26px] tracking-tight">{creator.name}</h1>
          <p className="text-[13px] text-ink-mute mt-0.5">
            {creator.role} · {formatViews(creator.followers)} followers · {(creator.shareBps / 100).toFixed(0)}% revenue share
          </p>
        </div>
        <div className="flex-1" />
        <Button size="md" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4" strokeWidth={2.2} /> New series
        </Button>
      </div>

      <div className="mt-6">
        <Segmented
          options={[
            { id: "overview", label: "Overview" },
            { id: "library", label: `Library (${stats.series})` },
            { id: "earnings", label: "Earnings" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {/* ------------------------------- overview ------------------------------ */}
      {tab === "overview" && (
        <>
          <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Series" value={String(stats.series)} sub={`${stats.published} live · ${stats.inReview} in review`} />
            <StatCard label="Episodes" value={String(stats.episodes)} sub="across all series" />
            <StatCard label="Plays (30d)" value={formatViews(stats.views30)} sub="play_start events" />
            <StatCard label="Earnings (30d)" value={money(stats.earnings30)} sub={`from ${money(stats.gross30)} gross`} />
          </div>

          <section className="mt-8">
            <SectionHeader title="Your top series" sub="Plays and net revenue over the last 30 days" />
            {topSeries.length ? (
              <div className="rounded-2xl ring-1 ring-line overflow-hidden divide-y divide-line">
                {topSeries.map((s) => (
                  <div key={s.id} className="flex items-center gap-4 px-4 py-3 hover:bg-wash/50 transition-colors">
                    <div className="relative w-[44px] h-[58px] rounded-lg overflow-hidden ring-1 ring-line shrink-0">
                      <Image src={s.cover_url} alt="" fill sizes="44px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/title/${s.id}`} className="text-[14px] font-medium truncate hover:text-ember transition-colors block">{s.title}</Link>
                      <p className="text-[12px] text-ink-mute mt-0.5 flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Eye className="w-3.5 h-3.5" strokeWidth={1.8} />{formatViews(s.views)}</span>
                        <span>{s.plays30} plays / 30d</span>
                      </p>
                    </div>
                    <span className="font-display text-[17px] tabular-nums shrink-0">{money(Number(s.net30) / 100)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<Film className="w-6 h-6" strokeWidth={1.6} />} title="No series yet" desc="Create your first series and upload an episode." action={<Button onClick={() => setCreating(true)}>New series</Button>} />
            )}
          </section>

          <section className="mt-10 pb-8 grid sm:grid-cols-3 gap-3">
            {[
              { icon: Upload, title: "Upload once, stream everywhere", body: "Every video is transcoded to a multi-bitrate HLS ladder with a poster and preview sprite." },
              { icon: Layers, title: "You control the paywall", body: "Free episodes, VIP pool, or pay-per-episode — enforced server-side, changeable any time." },
              { icon: Wallet, title: "70% of every unlock", body: "PPE revenue is attributed instantly. VIP pool is split monthly by watch time." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl ring-1 ring-line p-5">
                <span className="w-9 h-9 rounded-xl bg-wash flex items-center justify-center">
                  <c.icon className="w-[18px] h-[18px] text-ink-soft" strokeWidth={1.8} />
                </span>
                <h3 className="text-[14.5px] font-semibold mt-3.5">{c.title}</h3>
                <p className="text-[12.5px] text-ink-mute mt-1 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </section>
        </>
      )}

      {/* -------------------------------- library ------------------------------ */}
      {tab === "library" && (
        <section className="mt-5 pb-10">
          {series.length === 0 ? (
            <EmptyState icon={<Film className="w-6 h-6" strokeWidth={1.6} />} title="Your library is empty" desc="Create a series, upload episodes, submit for review." action={<Button onClick={() => setCreating(true)}>New series</Button>} />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {series.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setEditing(s)}
                  className="text-left rounded-2xl ring-1 ring-line overflow-hidden hover:ring-ink-faint/50 transition-all bg-paper"
                >
                  <div className="flex gap-3 p-3">
                    <div className="relative w-[64px] h-[86px] rounded-lg overflow-hidden ring-1 ring-line shrink-0">
                      <Image src={s.cover} alt="" fill sizes="64px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold truncate">{s.title}</p>
                      <p className="text-[12px] text-ink-mute mt-0.5">{s.genreName} · {s.episodes} EP</p>
                      <span className={cn("mt-2 h-5 px-2 inline-flex items-center rounded-full text-[10.5px] font-semibold", STATUS_TONE[s.publishState ?? "draft"])}>
                        {s.publishState}
                      </span>
                      {s.reviewNote && <p className="text-[11px] text-ember mt-1.5 line-clamp-2">{s.reviewNote}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-faint shrink-0 self-center" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ------------------------------- earnings ------------------------------ */}
      {tab === "earnings" && (
        <section className="mt-5 pb-10">
          {!earnings ? (
            <div className="py-20 text-center"><Loader2 className="w-5 h-5 animate-spin text-ink-faint mx-auto" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Available balance" value={money(earnings.balance)} sub="ready to withdraw" />
                <StatCard label="Net (30d)" value={money(earnings.last30.net / 100)} sub={`gross ${money(earnings.last30.gross / 100)}`} />
                <StatCard label="Lifetime net" value={money(earnings.lifetime.net / 100)} />
                <StatCard label="Revenue share" value={`${(earnings.shareBps / 100).toFixed(0)}%`} sub="per unlock" />
              </div>

              <div className="mt-4 rounded-2xl ring-1 ring-line bg-wash p-5">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-[15px] font-semibold">Daily net revenue</h2>
                  <span className="text-[12px] text-ink-faint">90d</span>
                </div>
                {earnings.daily.length > 1 ? (
                  <AreaChart data={earnings.daily.map((d) => ({ label: d.d.slice(5), value: Number(d.net) / 100 }))} format={(n) => money(n)} />
                ) : (
                  <p className="text-[13px] text-ink-faint py-10 text-center">Not enough history yet — revenue appears here as viewers unlock your episodes.</p>
                )}
              </div>

              <div className="mt-4 rounded-2xl ring-1 ring-line p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold">Withdraw {money(earnings.balance)}</p>
                  <p className="text-[12px] text-ink-mute mt-1">Requests land in the finance queue and are paid on the 5th.</p>
                </div>
                <Button size="md" onClick={withdraw} disabled={busy || earnings.balance <= 0}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" strokeWidth={1.9} />}
                  Request payout
                </Button>
              </div>
              {error && <p className="text-[12.5px] text-ember mt-2">{error}</p>}

              <div className="mt-8 grid lg:grid-cols-2 gap-4">
                <div>
                  <h2 className="text-[15px] font-semibold mb-3">Recent ledger</h2>
                  <div className="rounded-2xl ring-1 ring-line overflow-hidden divide-y divide-line max-h-[340px] overflow-y-auto">
                    {earnings.ledger.map((l: any) => (
                      <div key={l.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium truncate">{l.series_title ?? l.note ?? l.kind}</p>
                          <p className="text-[11.5px] text-ink-faint mt-0.5">{new Date(l.ts).toLocaleDateString()} · {l.kind}</p>
                        </div>
                        <span className={cn("text-[13px] font-semibold tabular-nums", Number(l.net_cents) >= 0 ? "text-ink" : "text-ember")}>
                          {money(Number(l.net_cents) / 100)}
                        </span>
                      </div>
                    ))}
                    {!earnings.ledger.length && <p className="px-4 py-8 text-center text-[13px] text-ink-faint">No entries yet.</p>}
                  </div>
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold mb-3">Payouts</h2>
                  <div className="rounded-2xl ring-1 ring-line overflow-hidden divide-y divide-line">
                    {earnings.payouts.map((p: any) => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium">{p.period}</p>
                          <p className="text-[11.5px] text-ink-faint mt-0.5">{p.note ?? p.method}</p>
                        </div>
                        <Badge tone={p.status === "paid" ? "neutral" : p.status === "hold" ? "ember" : "gold"}>{p.status}</Badge>
                        <span className="text-[13px] font-semibold tabular-nums w-20 text-right">{money(Number(p.net_cents) / 100)}</span>
                      </div>
                    ))}
                    {!earnings.payouts.length && <p className="px-4 py-8 text-center text-[13px] text-ink-faint">No payouts yet.</p>}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* --------------------------- new series sheet -------------------------- */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setCreating(false)} />
          <div className="relative bg-paper w-full lg:w-[520px] rounded-t-[20px] lg:rounded-[20px] animate-sheet-up p-6">
            <h3 className="font-display text-xl">New series</h3>
            <p className="text-[12.5px] text-ink-mute mt-1">
              We'll assign a placeholder cover from the VESPER art library so nothing looks empty — swap it any time.
            </p>
            <div className="mt-5 space-y-3">
              <input
                autoFocus
                value={newSeries.title}
                onChange={(e) => setNewSeries({ ...newSeries, title: e.target.value })}
                placeholder="Series title"
                className="w-full h-12 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-4 text-[14px] outline-none transition-shadow"
              />
              <select
                value={newSeries.genre}
                onChange={(e) => setNewSeries({ ...newSeries, genre: e.target.value })}
                className="w-full h-12 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none"
              >
                {genres.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <textarea
                value={newSeries.synopsis}
                onChange={(e) => setNewSeries({ ...newSeries, synopsis: e.target.value })}
                rows={3}
                placeholder="One paragraph that makes someone tap play."
                className="w-full rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-4 py-3 text-[14px] outline-none resize-none transition-shadow"
              />
              {error && <p className="text-[13px] text-ember">{error}</p>}
            </div>
            <div className="mt-5 flex gap-3">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setCreating(false)}>Cancel</Button>
              <Button size="lg" className="flex-1" onClick={create} disabled={busy}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" strokeWidth={2.4} />}
                Create draft
              </Button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <SeriesEditor
          series={editing}
          genres={genres}
          onChanged={() => void load()}
          onClose={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

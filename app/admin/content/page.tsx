"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminShell, FilterPills, Loading, Pager, SearchInput, StatusPill, Table, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { compact, money0 } from "@/lib/admin-format";
import { ExternalLink, Loader2, Star } from "@/components/icons";

export default function AdminContent() {
  const { permissions, user } = useConsole();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    setData(await api.get<any>(`/api/admin/content?${params}`));
  }, [q, status, page]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load().catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [load, user]);

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    try {
      await api.patch(`/api/admin/content/${id}`, body);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const canWrite = permissions.includes("content.write");

  return (
    <AdminShell title="Content Ops" sub="Catalogue health, performance and shelf control">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Published series" value={String(data.summary.published)} sub={`${data.summary.episodes} episodes`} />
            <StatCard label="In review" value={String(data.summary.review)} sub={`${data.summary.pendingReviews} queue items`} />
            <StatCard label="Open reports" value={String(data.summary.openReports)} sub={`${data.summary.offline} offline`} />
            <StatCard label="Media processing" value={String(data.summary.mediaProcessing)} sub="transcoder queue" />
          </div>

          <section className="mt-8">
            <h2 className="text-[15px] font-semibold mb-3">Series performance (live counters)</h2>
            <Table minWidth={1000} head={
              <>
                <th className="px-4 py-3">Series</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total views</th>
                <th className="px-4 py-3 text-right">Plays 7d</th>
                <th className="px-4 py-3 text-right">Paywalls 30d</th>
                <th className="px-4 py-3 text-right">Unlocks</th>
                <th className="px-4 py-3 text-right">Revenue 30d</th>
                <th className="px-4 py-3 text-right">Reports</th>
              </>
            }>
              {data.performance.map((s: any) => (
                <tr key={s.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">
                    <Link href={`/title/${s.id}`} className="hover:text-ember transition-colors inline-flex items-center gap-1.5">
                      {s.title} <ExternalLink className="w-3 h-3 opacity-50" />
                    </Link>
                  </td>
                  <td className="px-4 py-3"><StatusPill status={s.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{compact(s.views)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.views7d || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.paywalls || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.unlocks || "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.revenue30 ? money0(Number(s.revenue30) / 100) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span className={Number(s.reports) > 0 ? "text-ember font-semibold" : "text-ink-faint"}>{s.reports || "—"}</span>
                  </td>
                </tr>
              ))}
            </Table>
          </section>

          <section className="mt-8">
            <h2 className="text-[15px] font-semibold mb-3">Catalogue</h2>
            <Toolbar>
              <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Title, synopsis, tag…" />
              <FilterPills
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { id: "", label: "All" },
                  { id: "published", label: "Published" },
                  { id: "review", label: "In review" },
                  { id: "draft", label: "Draft" },
                  { id: "offline", label: "Offline" },
                ]}
              />
            </Toolbar>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.items.map((s: any) => (
                <div key={s.id} className="rounded-2xl ring-1 ring-line bg-wash overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <div className="relative w-[58px] h-[78px] rounded-lg overflow-hidden ring-1 ring-line shrink-0">
                      <Image src={s.cover} alt="" fill sizes="58px" className="object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/title/${s.id}`} className="text-[13.5px] font-semibold truncate block hover:text-ember transition-colors">{s.title}</Link>
                      <p className="text-[11.5px] text-ink-mute mt-0.5">{s.creatorName} · {s.genreName}</p>
                      <p className="text-[11.5px] text-ink-faint mt-0.5 inline-flex items-center gap-1">
                        <Star className="w-3 h-3 fill-gold text-gold" />{s.rating.toFixed(1)} · {s.episodes} EP · {compact(s.views)} views
                      </p>
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <StatusPill status={s.publishState} />
                        {s.featured && <span className="h-6 px-2.5 inline-flex items-center rounded-full bg-gold-tint text-gold text-[11px] font-semibold">Featured</span>}
                      </div>
                    </div>
                  </div>
                  {canWrite && (
                    <div className="px-3 pb-3 flex gap-1.5 flex-wrap">
                      <button
                        onClick={() => patch(s.id, { status: s.publishState === "published" ? "offline" : "published" })}
                        disabled={busy === s.id}
                        className="h-7 px-2.5 rounded-full ring-1 ring-line bg-paper text-[11.5px] font-medium hover:border-ink-faint transition-colors"
                      >
                        {busy === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : s.publishState === "published" ? "Take offline" : "Publish"}
                      </button>
                      <button
                        onClick={() => patch(s.id, { featured: !s.featured })}
                        disabled={busy === s.id}
                        className="h-7 px-2.5 rounded-full ring-1 ring-line bg-paper text-[11.5px] font-medium hover:border-ink-faint transition-colors"
                      >
                        {s.featured ? "Unfeature" : "Feature"}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </section>
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

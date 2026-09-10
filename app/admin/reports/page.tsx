"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell, FilterPills, Loading, Pager, StatusPill, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { AlertTriangle, Check, Loader2, X } from "@/components/icons";

export default function AdminReports() {
  const { permissions, user } = useConsole();
  const [status, setStatus] = useState("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (status) params.set("status", status);
    setData(await api.get<any>(`/api/admin/reports?${params}`));
  }, [status, page]);

  useEffect(() => {
    if (!user) return;
    void load().catch(() => {});
  }, [load, user]);

  async function resolve(id: string, next: "resolved" | "dismissed", action: "none" | "hide" | "offline") {
    setBusy(id);
    try {
      await api.post(`/api/admin/reports/${id}`, { status: next, action });
      await load();
    } finally {
      setBusy(null);
    }
  }

  const canHandle = permissions.includes("reports.handle");

  return (
    <AdminShell title="Reports" sub="Viewer-submitted moderation queue">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Open" value={String(data.summary.open)} />
            <StatCard label="Resolved" value={String(data.summary.resolved)} />
            <StatCard label="Dismissed" value={String(data.summary.dismissed)} />
          </div>

          <Toolbar>
            <FilterPills
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { id: "open", label: "Open" },
                { id: "resolved", label: "Resolved" },
                { id: "dismissed", label: "Dismissed" },
                { id: "", label: "All" },
              ]}
            />
          </Toolbar>

          <div className="space-y-3">
            {data.items.map((r: any) => (
              <div key={r.id} className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className="w-9 h-9 rounded-xl bg-ember-tint text-ember flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" strokeWidth={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">{r.reason}</p>
                    <p className="text-[12px] text-ink-mute mt-1">
                      {r.target_type} ·{" "}
                      {r.target_type === "series" ? (
                        <Link href={`/title/${r.target_id}`} className="hover:text-ink transition-colors underline">{r.series_title ?? r.target_id}</Link>
                      ) : (
                        r.target_id
                      )}{" "}
                      · reported by {r.reporter_name ?? "anonymous"} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.detail && <p className="text-[12.5px] text-ink-soft mt-2 leading-relaxed">{r.detail}</p>}
                    {r.resolution && <p className="text-[12.5px] text-ink-mute mt-2">Resolution: {r.resolution}</p>}
                  </div>
                  <StatusPill status={r.status} />
                </div>

                {r.status === "open" && canHandle && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => resolve(r.id, "dismissed", "none")}
                      disabled={busy === r.id}
                      className="h-9 px-4 rounded-full ring-1 ring-line bg-paper text-[12.5px] font-medium hover:border-ink-faint transition-colors inline-flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.4} /> Dismiss
                    </button>
                    {r.target_type === "comment" && (
                      <button
                        onClick={() => resolve(r.id, "resolved", "hide")}
                        disabled={busy === r.id}
                        className="h-9 px-4 rounded-full ring-1 ring-line bg-paper text-[12.5px] font-medium hover:text-ember transition-colors"
                      >
                        Hide comment
                      </button>
                    )}
                    {r.target_type === "series" && (
                      <button
                        onClick={() => resolve(r.id, "resolved", "offline")}
                        disabled={busy === r.id}
                        className="h-9 px-4 rounded-full ring-1 ring-line bg-paper text-[12.5px] font-medium hover:text-ember transition-colors"
                      >
                        Take series offline
                      </button>
                    )}
                    <button
                      onClick={() => resolve(r.id, "resolved", "none")}
                      disabled={busy === r.id}
                      className="h-9 px-4 rounded-full bg-inv text-white text-[12.5px] font-semibold hover:bg-invhi transition-colors inline-flex items-center gap-1.5"
                    >
                      {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.6} />}
                      Mark resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!data.items.length && (
              <div className="rounded-2xl ring-1 ring-line bg-wash py-16 text-center">
                <p className="text-[14px] font-medium">Nothing to moderate</p>
                <p className="text-[12.5px] text-ink-mute mt-1">Reports from the apps arrive here in real time.</p>
              </div>
            )}
          </div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

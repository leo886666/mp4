"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AdminShell, FilterPills, Loading, Pager, StatusPill, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { Check, X, Loader2, ExternalLink } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function AdminReviews() {
  const { permissions, user } = useConsole();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (status) params.set("status", status);
    setData(await api.get<any>(`/api/admin/reviews?${params}`));
  }, [status, page]);

  useEffect(() => {
    if (!user) return;
    void load().catch(() => {});
  }, [load, user]);

  async function decide(id: string, decision: "approved" | "rejected") {
    setBusy(id);
    try {
      await api.post(`/api/admin/reviews/${id}`, { decision, note: note[id] });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  }

  const canDecide = permissions.includes("review.decide");

  return (
    <AdminShell title="Review queue" sub="Creator submissions — approving publishes the series to the live catalogue">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <StatCard label="Pending" value={String(data.summary.pending)} />
            <StatCard label="Approved" value={String(data.summary.approved)} />
            <StatCard label="Rejected" value={String(data.summary.rejected)} />
          </div>

          <Toolbar>
            <FilterPills
              value={status}
              onChange={(v) => { setStatus(v); setPage(1); }}
              options={[
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
                { id: "", label: "All" },
              ]}
            />
          </Toolbar>

          <div className="space-y-3">
            {data.items.map((r: any) => (
              <div key={r.id} className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <span className={cn(
                    "w-2.5 h-2.5 rounded-full shrink-0 mt-2",
                    r.status === "pending" ? "bg-gold" : r.status === "approved" ? "bg-emerald-500" : "bg-ember"
                  )} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14.5px] font-semibold">{r.title}</p>
                    <p className="text-[12px] text-ink-mute mt-1">
                      {r.kind} · {r.submitter_name} · {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.note && <p className="text-[12.5px] text-ink-soft mt-2">{r.note}</p>}
                    {r.decision_note && <p className="text-[12.5px] text-ember mt-2">Decision note: {r.decision_note}</p>}
                    {r.series_id && (
                      <Link href={`/title/${r.series_id}`} className="text-[12.5px] font-medium text-ink-mute hover:text-ink inline-flex items-center gap-1 mt-2">
                        Preview series <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                  <StatusPill status={r.status} />
                </div>

                {r.status === "pending" && canDecide && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <input
                      value={note[r.id] ?? ""}
                      onChange={(e) => setNote({ ...note, [r.id]: e.target.value })}
                      placeholder="Note to the creator (optional)"
                      className="flex-1 min-w-[220px] h-9 rounded-full bg-paper ring-1 ring-line focus:ring-ink px-4 text-[13px] outline-none transition-shadow"
                    />
                    <button
                      onClick={() => decide(r.id, "rejected")}
                      disabled={busy === r.id}
                      className="h-9 px-4 rounded-full ring-1 ring-line bg-paper text-[12.5px] font-medium hover:text-ember hover:ring-ember/40 transition-colors inline-flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" strokeWidth={2.4} /> Reject
                    </button>
                    <button
                      onClick={() => decide(r.id, "approved")}
                      disabled={busy === r.id}
                      className="h-9 px-4 rounded-full bg-inv text-white text-[12.5px] font-semibold hover:bg-invhi transition-colors inline-flex items-center gap-1.5"
                    >
                      {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" strokeWidth={2.6} />}
                      Approve & publish
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!data.items.length && (
              <div className="rounded-2xl ring-1 ring-line bg-wash py-16 text-center">
                <p className="text-[14px] font-medium">Queue is clear</p>
                <p className="text-[12.5px] text-ink-mute mt-1">New creator submissions land here instantly.</p>
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

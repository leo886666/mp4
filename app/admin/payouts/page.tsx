"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, FilterPills, Loading, Pager, StatusPill, Table, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { money0, money2 } from "@/lib/admin-format";
import { Button } from "@/components/ui";
import { Loader2, Wallet } from "@/components/icons";

export default function AdminPayouts() {
  const { permissions, user } = useConsole();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [settleMsg, setSettleMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (status) params.set("status", status);
    setData(await api.get<any>(`/api/admin/payouts?${params}`));
  }, [status, page]);

  useEffect(() => { if (user) void load().catch(() => {}); }, [load, user]);

  async function mark(id: string, next: string) {
    setBusy(id);
    try {
      await api.post(`/api/admin/payouts/${id}`, { status: next });
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function settle() {
    const period = window.prompt("Settle which period? (YYYY-MM)", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 7));
    if (!period) return;
    setBusy("settle");
    try {
      const res = await api.post<{ poolCents: number; payouts: number }>("/api/admin/payouts", { period });
      setSettleMsg(`Split ${money2(res.poolCents / 100)} of VIP pool into ${res.payouts} payouts.`);
      await load();
    } catch (e: any) {
      setSettleMsg(e?.message ?? "Settlement failed");
    } finally {
      setBusy(null);
    }
  }

  const canWrite = permissions.includes("payouts.write");

  return (
    <AdminShell
      title="Creator payouts"
      sub="VIP pool split by watch time · pay-per-episode attributed per order"
      actions={canWrite && <Button size="md" onClick={settle} disabled={busy === "settle"}>
        {busy === "settle" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" strokeWidth={1.9} />} Run settlement
      </Button>}
    >
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="VIP pool (all time)" value={money0(data.summary.poolCents / 100)} sub="subscription revenue" />
            <StatCard label="Scheduled + pending" value={money0(data.summary.pendingCents / 100)} />
            <StatCard label="Paid out" value={money0(data.summary.paidCents / 100)} />
            <StatCard label="On hold" value={money0(data.summary.holdCents / 100)} />
          </div>
          {settleMsg && <p className="text-[13px] text-ink-mute mt-3">{settleMsg}</p>}

          <section className="mt-8">
            <h2 className="text-[15px] font-semibold mb-3">Creator balances</h2>
            <Table minWidth={700} head={
              <>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3 text-right">Series</th>
                <th className="px-4 py-3 text-right">Share</th>
                <th className="px-4 py-3 text-right">Balance</th>
              </>
            }>
              {data.creators.map((c: any) => (
                <tr key={c.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.series_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{(c.share_bps / 100).toFixed(0)}%</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{money2(c.balance_cents / 100)}</td>
                </tr>
              ))}
            </Table>
          </section>

          <section className="mt-8">
            <h2 className="text-[15px] font-semibold mb-3">Payout queue</h2>
            <Toolbar>
              <FilterPills
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { id: "", label: "All" },
                  { id: "pending", label: "Pending" },
                  { id: "scheduled", label: "Scheduled" },
                  { id: "paid", label: "Paid" },
                  { id: "hold", label: "On hold" },
                ]}
              />
            </Toolbar>
            <Table minWidth={860} head={
              <>
                <th className="px-4 py-3">Creator</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3">Note</th>
                {canWrite && <th className="px-4 py-3 text-right">Actions</th>}
              </>
            }>
              {data.items.map((p: any) => (
                <tr key={p.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3 font-medium">{p.creator_name}</td>
                  <td className="px-4 py-3 tabular-nums">{p.period}</td>
                  <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{money2(p.gross_cents / 100)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{money2(p.net_cents / 100)}</td>
                  <td className="px-4 py-3 text-ink-mute text-[12px] max-w-[220px] truncate">{p.note ?? "—"}</td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex gap-1.5">
                        {p.status !== "paid" && (
                          <button onClick={() => mark(p.id, "paid")} disabled={busy === p.id} className="h-7 px-2.5 rounded-full bg-inv text-white text-[11.5px] font-semibold hover:bg-invhi transition-colors">
                            {busy === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Mark paid"}
                          </button>
                        )}
                        {p.status !== "hold" && (
                          <button onClick={() => mark(p.id, "hold")} disabled={busy === p.id} className="h-7 px-2.5 rounded-full ring-1 ring-line bg-paper text-[11.5px] font-medium hover:text-ember transition-colors">
                            Hold
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
            <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </section>
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

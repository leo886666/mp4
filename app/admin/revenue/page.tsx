"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, FilterPills, Loading, Pager, SearchInput, StatusPill, Table, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard, AreaChart, Donut, BarChart } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { compact, money0, money2 } from "@/lib/admin-format";
import { Loader2 } from "@/components/icons";

export default function AdminRevenue() {
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
    setData(await api.get<any>(`/api/admin/orders?${params}`));
  }, [q, status, page]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load().catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [load, user]);

  async function refund(id: string) {
    const reason = window.prompt("Refund reason?", "Customer request");
    if (!reason) return;
    setBusy(id);
    try {
      await api.post(`/api/admin/orders/${id}/refund`, { reason });
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Refund failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell title="Payments" sub="Orders, subscriptions, refunds and settlement inputs">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Gross (all time)" value={money0(data.summary.grossCents / 100)} sub={`${compact(data.summary.paid)} paid orders`} />
            <StatCard label="Revenue (30d)" value={money0(data.kpis.revenue30Cents / 100)} delta={data.kpis.revenueDelta} />
            <StatCard label="ARPPU (30d)" value={money2(data.kpis.arppuCents / 100)} sub={`${data.kpis.payingRate}% paying`} />
            <StatCard label="Refunded" value={money0(data.summary.refundedCents / 100)} sub={`${data.summary.refunded} orders`} />
          </div>

          <div className="grid lg:grid-cols-[1fr_340px] gap-4 mt-4">
            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <h2 className="text-[15px] font-semibold mb-3">Daily revenue</h2>
              <AreaChart data={data.daily.slice(0, -1).map((d: any) => ({ label: d.date.slice(5), value: d.revenue_cents / 100 }))} format={money0} />
            </section>
            <div className="space-y-4">
              <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <h2 className="text-[15px] font-semibold mb-4">Plan mix</h2>
                {data.planMix.length ? <Donut data={data.planMix.map((p: any) => ({ name: p.name, share: p.share }))} /> : <p className="text-[13px] text-ink-faint">No data</p>}
              </section>
              <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <h2 className="text-[15px] font-semibold mb-4">Methods & success rate</h2>
                <BarChart data={data.methods.map((m: any) => ({ label: `${m.name} (${m.success}%)`, value: m.share }))} format={(n) => String(n)} />
              </section>
            </div>
          </div>

          <section className="mt-8">
            <Toolbar>
              <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Order id, email, title…" />
              <FilterPills
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { id: "", label: "All" },
                  { id: "paid", label: "Paid" },
                  { id: "pending", label: "Pending" },
                  { id: "refunded", label: "Refunded" },
                  { id: "failed", label: "Failed" },
                ]}
              />
            </Toolbar>

            <Table head={
              <>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Gateway</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </>
            }>
              {data.items.map((o: any) => (
                <tr key={o.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[220px]">{o.title}</p>
                    <p className="text-[11.5px] text-ink-faint">{o.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="truncate max-w-[160px]">{o.user.name}</p>
                    <p className="text-[11.5px] text-ink-faint truncate max-w-[160px]">{o.user.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize text-ink-mute">{o.kind}</td>
                  <td className="px-4 py-3 text-ink-mute">{o.gateway}</td>
                  <td className="px-4 py-3"><StatusPill status={o.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{money2(o.amount)}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-mute">{o.paidAt ? new Date(o.paidAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {o.status === "paid" && permissions.includes("orders.refund") ? (
                      <button
                        onClick={() => refund(o.id)}
                        disabled={busy === o.id}
                        className="h-7 px-3 rounded-full ring-1 ring-line text-[11.5px] font-medium hover:bg-paper hover:text-ember transition-colors"
                      >
                        {busy === o.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Refund"}
                      </button>
                    ) : (
                      <span className="text-[11.5px] text-ink-faint">—</span>
                    )}
                  </td>
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

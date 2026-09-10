"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, Loading, StatusPill, Table, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard, BarChart } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { compact, money0, money2 } from "@/lib/admin-format";
import { Button } from "@/components/ui";
import { Plus, Loader2 } from "@/components/icons";
import { cn } from "@/lib/utils";

export default function AdminPromotion() {
  const { permissions, user } = useConsole();
  const [data, setData] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ channel: "TikTok Ads", name: "", spend: 0, installs: 0 });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => setData(await api.get<any>("/api/admin/campaigns")), []);
  useEffect(() => { if (user) void load().catch(() => {}); }, [load, user]);

  async function create() {
    setBusy(true);
    try {
      await api.post("/api/admin/campaigns", form);
      setCreating(false);
      setForm({ channel: "TikTok Ads", name: "", spend: 0, installs: 0 });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggle(id: string, status: string) {
    await api.patch(`/api/admin/campaigns/${id}`, { status: status === "running" ? "paused" : "running" });
    await load();
  }

  const canWrite = permissions.includes("campaigns.write");

  return (
    <AdminShell
      title="Promotion & ROI"
      sub="Spend against attributed revenue — users carry their campaign id from signup"
      actions={canWrite && <Button size="md" onClick={() => setCreating(true)}><Plus className="w-4 h-4" strokeWidth={2.2} /> New campaign</Button>}
    >
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Total spend" value={money0(data.totals.spend)} />
            <StatCard label="Attributed revenue" value={money0(data.totals.revenue)} />
            <StatCard label="Blended ROI" value={data.totals.spend ? `${Math.round(((data.totals.revenue - data.totals.spend) / data.totals.spend) * 100)}%` : "—"} />
            <StatCard label="Installs" value={compact(data.totals.installs)} />
          </div>

          <section className="rounded-2xl ring-1 ring-line bg-wash p-5 mt-4">
            <h2 className="text-[15px] font-semibold mb-4">Attributed revenue by campaign</h2>
            <BarChart data={data.items.map((c: any) => ({ label: c.name, value: c.revenue }))} format={money0} />
          </section>

          <section className="mt-8">
            <h2 className="text-[15px] font-semibold mb-3">Campaigns</h2>
            <Table minWidth={1040} head={
              <>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Campaign</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Spend</th>
                <th className="px-4 py-3 text-right">Installs</th>
                <th className="px-4 py-3 text-right">Signups</th>
                <th className="px-4 py-3 text-right">Payers</th>
                <th className="px-4 py-3 text-right">CPI</th>
                <th className="px-4 py-3 text-right">ARPU</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">ROI</th>
                {canWrite && <th className="px-4 py-3" />}
              </>
            }>
              {data.items.map((c: any) => (
                <tr key={c.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{c.channel}</td>
                  <td className="px-4 py-3 text-ink-mute whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.spend ? money0(c.spend) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{compact(c.installs)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{compact(c.users)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{compact(c.payers)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{c.cpi ? money2(c.cpi) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{money2(c.arpu)}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{money0(c.revenue)}</td>
                  <td className={cn("px-4 py-3 text-right tabular-nums font-semibold", c.roi === null ? "text-ink-faint" : c.roi >= 0 ? "text-emerald-600" : "text-ember")}>
                    {c.roi === null ? "organic" : `${c.roi}%`}
                  </td>
                  {canWrite && (
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggle(c.id, c.status)} className="h-7 px-3 rounded-full ring-1 ring-line bg-paper text-[11.5px] font-medium hover:border-ink-faint transition-colors">
                        {c.status === "running" ? "Pause" : "Resume"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </Table>
            <p className="text-[12px] text-ink-faint mt-3">
              Signups and payers are counted from the users table by campaign_id — no modelled attribution.
            </p>
          </section>

          {creating && (
            <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center">
              <div className="absolute inset-0 bg-black/50" onClick={() => setCreating(false)} />
              <div className="relative bg-paper w-full lg:w-[480px] rounded-t-[20px] lg:rounded-[20px] animate-sheet-up p-6">
                <h3 className="font-display text-xl">New campaign</h3>
                <div className="mt-4 space-y-3">
                  <input value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} placeholder="Channel" className="w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none" />
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" className="w-full h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="number" value={form.spend} onChange={(e) => setForm({ ...form, spend: Number(e.target.value) })} placeholder="Spend (USD)" className="h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none" />
                    <input type="number" value={form.installs} onChange={(e) => setForm({ ...form, installs: Number(e.target.value) })} placeholder="Installs" className="h-11 rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3.5 text-[14px] outline-none" />
                  </div>
                </div>
                <div className="mt-5 flex gap-3">
                  <Button variant="secondary" size="lg" className="flex-1" onClick={() => setCreating(false)}>Cancel</Button>
                  <Button size="lg" className="flex-1" onClick={create} disabled={busy || !form.name}>
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create
                  </Button>
                </div>
              </div>
            </div>
          )}
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

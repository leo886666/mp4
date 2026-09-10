"use client";

import { useEffect, useState } from "react";
import { AdminShell, Loading , useConsole } from "@/components/admin/shell";
import { StatCard, AreaChart, Funnel, Donut, BarChart, CohortTable } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { money0, compact } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

interface OverviewData {
  kpis: any;
  counts: any;
  daily: any[];
  funnel: { stage: string; value: number }[];
  planMix: { name: string; share: number; revenueCents: number }[];
  geo: { country: string; users: number; revenueCents: number; arpuCents: number }[];
  paymentMethods: { name: string; share: number; success: number }[];
  cohorts: any[];
  jobs: { depth: { status: string; n: number }[]; recent: any[] };
}

export default function AdminOverview() {
  const { user } = useConsole();
  const [data, setData] = useState<OverviewData | null>(null);

  useEffect(() => {
    if (!user) return;
    void api.get<OverviewData>("/api/admin/overview?days=90").then(setData).catch(() => {});
  }, [user]);

  return (
    <AdminShell title="Overview" sub="Live from the platform database · last 90 days">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="DAU" value={compact(data.kpis.dau)} delta={data.kpis.dauDelta} sub={`${data.kpis.dauDate} · today ${compact(data.kpis.dauToday)} so far`} />
            <StatCard label="New users (30d)" value={compact(data.kpis.newUsers30)} delta={data.kpis.newUsersDelta} />
            <StatCard label="Revenue (30d)" value={money0(data.kpis.revenue30Cents / 100)} delta={data.kpis.revenueDelta} sub={`${compact(data.kpis.orders30)} orders`} />
            <StatCard label="Paying rate" value={`${data.kpis.payingRate}%`} sub={`ARPPU ${money0(data.kpis.arppuCents / 100)}`} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <StatCard label="VIP members" value={compact(data.kpis.vipUsers)} sub={`${compact(data.counts.users)} accounts`} />
            <StatCard label="Watch minutes (30d)" value={compact(data.kpis.watchMinutes30)} />
            <StatCard label="Payment success" value={`${data.kpis.paymentSuccess}%`} sub={`refunds ${data.kpis.refundRate}%`} />
            <StatCard label="Pending reviews" value={String(data.counts.pendingReviews)} sub={`${data.counts.openReports} open reports`} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold">Daily active users</h2>
                <span className="text-[12px] text-ink-faint tabular-nums">90d</span>
              </div>
              {/* the current day is still accumulating — charts show complete days only */}
              <AreaChart data={data.daily.slice(0, -1).map((d) => ({ label: d.date.slice(5), value: d.dau }))} format={(n) => compact(n)} />
            </section>

            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[15px] font-semibold">Daily revenue</h2>
                <span className="text-[12px] text-ink-faint tabular-nums">90d</span>
              </div>
              <AreaChart data={data.daily.slice(0, -1).map((d) => ({ label: d.date.slice(5), value: d.revenue_cents / 100 }))} format={money0} />
            </section>
          </div>

          <div className="grid lg:grid-cols-[1fr_360px] gap-4 mt-4">
            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <h2 className="text-[15px] font-semibold mb-4">Acquisition → renewal funnel (90d)</h2>
              <Funnel stages={data.funnel} />
              <p className="text-[12px] text-ink-faint mt-4">
                Every stage is a live count over the events and orders tables — not a stored aggregate.
              </p>
            </section>

            <div className="space-y-4">
              <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <h2 className="text-[15px] font-semibold mb-4">Plan mix</h2>
                {data.planMix.length ? (
                  <Donut data={data.planMix.map((p) => ({ name: p.name, share: p.share }))} />
                ) : (
                  <p className="text-[13px] text-ink-faint py-6 text-center">No subscription orders yet.</p>
                )}
              </section>
              <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
                <h2 className="text-[15px] font-semibold mb-4">Top geos by revenue</h2>
                <BarChart data={data.geo.map((g) => ({ label: g.country, value: g.revenueCents / 100 }))} format={money0} />
              </section>
            </div>
          </div>

          <div className="grid lg:grid-cols-[1fr_380px] gap-4 mt-4">
            <section>
              <h2 className="text-[15px] font-semibold mb-3">Signup cohorts — retention</h2>
              <CohortTable cohorts={data.cohorts} />
            </section>
            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <h2 className="text-[15px] font-semibold mb-4">Transcoding queue</h2>
              <div className="flex flex-wrap gap-2">
                {data.jobs.depth.length === 0 && <p className="text-[13px] text-ink-faint">Idle — nothing queued.</p>}
                {data.jobs.depth.map((d) => (
                  <span key={d.status} className={cn(
                    "h-7 px-3 inline-flex items-center rounded-full text-[12px] font-medium",
                    d.status === "failed" ? "bg-ember-tint text-ember" : d.status === "done" ? "bg-emerald-50 text-emerald-700" : "bg-gold-tint text-gold"
                  )}>
                    {d.status} · {d.n}
                  </span>
                ))}
              </div>
              <div className="mt-4 space-y-2 max-h-[220px] overflow-y-auto">
                {data.jobs.recent.map((j) => (
                  <div key={j.id} className="flex items-center gap-3 text-[12px]">
                    <span className="text-ink-mute w-[86px] truncate">{j.kind}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-line overflow-hidden">
                      <div className={cn("h-full rounded-full", j.status === "failed" ? "bg-ember" : "bg-inv")} style={{ width: `${j.progress}%` }} />
                    </div>
                    <span className="text-ink-faint w-14 text-right">{j.status}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 hairline-t text-[12px] text-ink-mute space-y-1">
                <p>{data.counts.series} published series · {data.counts.episodes} episodes</p>
                <p>{data.counts.mediaReady} media assets ready · {data.counts.mediaPending} processing</p>
              </div>
            </section>
          </div>
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

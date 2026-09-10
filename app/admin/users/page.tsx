"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, FilterPills, Loading, Pager, SearchInput, StatusPill, Table, Toolbar, useConsole } from "@/components/admin/shell";
import { StatCard, AreaChart, CohortTable } from "@/components/admin/charts";
import { api } from "@/lib/client/api";
import { compact, money0 } from "@/lib/admin-format";
import { Avatar, Button } from "@/components/ui";
import { Crown, Loader2 } from "@/components/icons";

export default function AdminUsers() {
  const { permissions, user } = useConsole();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "25" });
    if (q) params.set("q", q);
    if (filter === "vip") params.set("vip", "1");
    else if (filter === "suspended") params.set("status", "suspended");
    else if (filter) params.set("role", filter);
    setData(await api.get<any>(`/api/admin/users?${params}`));
  }, [q, filter, page]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load().catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [load, user]);

  async function act(id: string, patch: Record<string, unknown>) {
    setBusy(id);
    try {
      await api.patch(`/api/admin/users/${id}`, patch);
      await load();
    } finally {
      setBusy(null);
    }
  }

  const canWrite = permissions.includes("users.write");

  return (
    <AdminShell title="Users & Retention" sub="Every account, its spend and its cohort">
      {!data ? (
        <Loading />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <StatCard label="Total accounts" value={compact(data.summary.total)} />
            <StatCard label="VIP members" value={compact(data.summary.vip)} />
            <StatCard label="New (7d)" value={compact(data.summary.new7d)} />
            <StatCard label="Creators" value={String(data.summary.creators)} />
            <StatCard label="Suspended" value={String(data.summary.suspended)} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
              <h2 className="text-[15px] font-semibold mb-3">New signups</h2>
              <AreaChart data={data.daily.slice(0, -1).map((d: any) => ({ label: d.date.slice(5), value: d.new_users }))} format={compact} />
            </section>
            <section>
              <h2 className="text-[15px] font-semibold mb-3">Retention by signup week</h2>
              <CohortTable cohorts={data.cohorts} />
            </section>
          </div>

          <section className="mt-8">
            <Toolbar>
              <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, email or id…" />
              <FilterPills
                value={filter}
                onChange={(v) => { setFilter(v); setPage(1); }}
                options={[
                  { id: "", label: "All" },
                  { id: "vip", label: "VIP" },
                  { id: "creator", label: "Creators" },
                  { id: "admin", label: "Admins" },
                  { id: "suspended", label: "Suspended" },
                ]}
              />
            </Toolbar>

            <Table head={
              <>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Country</th>
                <th className="px-4 py-3">Channel</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Last seen</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </>
            }>
              {data.items.map((u: any) => (
                <tr key={u.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar initials={u.initials} size="sm" />
                      <div className="min-w-0">
                        <p className="font-medium truncate flex items-center gap-1.5">
                          {u.name}
                          {u.vip && <Crown className="w-3.5 h-3.5 fill-gold text-gold" />}
                        </p>
                        <p className="text-[11.5px] text-ink-faint truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3"><StatusPill status={u.status} /></td>
                  <td className="px-4 py-3 text-ink-mute">{u.country}</td>
                  <td className="px-4 py-3 text-ink-mute">{u.channel}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-mute">{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-mute">{u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleDateString() : "—"}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    {canWrite ? (
                      <div className="inline-flex gap-1.5">
                        <button
                          onClick={() => act(u.id, { grantVipDays: 30 })}
                          disabled={busy === u.id}
                          className="h-7 px-2.5 rounded-full ring-1 ring-line text-[11.5px] font-medium hover:bg-paper transition-colors"
                        >
                          {busy === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "+30d VIP"}
                        </button>
                        <button
                          onClick={() => act(u.id, { status: u.status === "suspended" ? "active" : "suspended" })}
                          disabled={busy === u.id}
                          className="h-7 px-2.5 rounded-full ring-1 ring-line text-[11.5px] font-medium hover:bg-paper transition-colors"
                        >
                          {u.status === "suspended" ? "Restore" : "Suspend"}
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11.5px] text-ink-faint">read-only</span>
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

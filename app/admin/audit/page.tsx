"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell, Loading, Pager, SearchInput, Table, Toolbar , useConsole } from "@/components/admin/shell";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export default function AdminAudit() {
  const { user } = useConsole();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), perPage: "40" });
    if (q) params.set("q", q);
    if (action) params.set("action", action);
    setData(await api.get<any>(`/api/admin/audit?${params}`));
  }, [q, action, page]);

  useEffect(() => {
    if (!user) return;
    const t = setTimeout(() => void load().catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [load, user]);

  return (
    <AdminShell title="Audit log" sub="Every privileged action, who did it and when">
      {!data ? (
        <Loading />
      ) : (
        <>
          <Toolbar>
            <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Actor, action, target…" />
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="h-9 rounded-full bg-wash ring-1 ring-line px-3.5 text-[13px] outline-none"
            >
              <option value="">All actions</option>
              {data.actions.map((a: any) => (
                <option key={a.action} value={a.action}>{a.action} ({a.n})</option>
              ))}
            </select>
          </Toolbar>

          <Table minWidth={900} head={
            <>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Detail</th>
              <th className="px-4 py-3">IP</th>
            </>
          }>
            {data.items.map((a: any) => (
              <tr key={a.id} className="hover:bg-wash/50">
                <td className="px-4 py-3 tabular-nums text-ink-mute whitespace-nowrap">{new Date(a.ts).toLocaleString()}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{a.actor_name ?? a.actor_id ?? "system"}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    "inline-flex h-6 px-2.5 items-center rounded-full text-[11px] font-semibold font-mono",
                    a.action.includes("refund") || a.action.includes("reject") || a.action.includes("suspend") ? "bg-ember-tint text-ember" : "bg-wash text-ink-soft ring-1 ring-line"
                  )}>
                    {a.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-ink-mute font-mono text-[11.5px] whitespace-nowrap">{a.target_type ? `${a.target_type}:${a.target_id}` : "—"}</td>
                <td className="px-4 py-3 text-ink-faint text-[11.5px] max-w-[320px] truncate">{a.detail ?? "—"}</td>
                <td className="px-4 py-3 text-ink-faint tabular-nums">{a.ip ?? "—"}</td>
              </tr>
            ))}
          </Table>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

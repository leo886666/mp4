"use client";

/** Lightweight dependency-free SVG charts for the ops console. */

export function StatCard({
  label, value, delta, sub,
}: { label: string; value: string; delta?: number; sub?: string }) {
  return (
    <div className="rounded-2xl ring-1 ring-line p-4 sm:p-5 bg-wash">
      <p className="text-[12px] font-medium text-ink-mute">{label}</p>
      <p className="font-display text-[24px] sm:text-[26px] tracking-tight mt-1.5 tabular-nums">{value}</p>
      <p className="text-[12px] mt-1 flex items-center gap-1.5">
        {delta !== undefined && (
          <span className={delta >= 0 ? "text-emerald-600 font-semibold" : "text-ember font-semibold"}>
            {delta >= 0 ? "+" : ""}
            {delta}%
          </span>
        )}
        {sub && <span className="text-ink-faint">{sub}</span>}
      </p>
    </div>
  );
}

export function AreaChart({
  data, height = 180, format,
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
}) {
  const W = 640;
  const H = height;
  const pad = { t: 10, r: 4, b: 22, l: 4 };
  const max = Math.max(...data.map((d) => d.value));
  const min = Math.min(...data.map((d) => d.value));
  const range = max - min || 1;
  const x = (i: number) => pad.l + (i / (data.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${H - pad.b} L${x(0).toFixed(1)},${H - pad.b} Z`;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full text-ember" role="img">
        <path d={area} fill="currentColor" opacity="0.09" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(data.length - 1)} cy={y(data[data.length - 1].value)} r="3.5" fill="currentColor" />
      </svg>
      <div className="flex justify-between text-[10px] text-ink-faint mt-1 tabular-nums">
        <span>{data[0].label}</span>
        <span>{data[Math.floor(data.length / 2)].label}</span>
        <span>
          {data[data.length - 1].label}
          {format ? ` · ${format(data[data.length - 1].value)}` : ""}
        </span>
      </div>
    </div>
  );
}

export function BarChart({
  data, format,
}: {
  data: { label: string; value: number }[];
  format?: (n: number) => string;
}) {
  const max = Math.max(...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 sm:w-36 shrink-0 text-[12px] text-ink-soft truncate">{d.label}</span>
          <div className="flex-1 h-6 rounded-lg bg-wash overflow-hidden">
            <div
              className="h-full rounded-lg bg-inv/85"
              style={{ width: `${Math.max(2, (d.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-20 text-right text-[12px] tabular-nums text-ink-mute shrink-0">
            {format ? format(d.value) : d.value.toLocaleString("en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

export function Donut({
  data, size = 168,
}: {
  data: { name: string; share: number }[];
  size?: number;
}) {
  // first slice uses the current inverted surface so it stays visible in both themes
  const colors = ["rgb(var(--invbg))", "rgb(var(--ember))", "#B98A2F", "#8A8A96"];
  const r = 54;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 140 140" role="img">
        {data.map((d, i) => {
          const len = (d.share / 100) * c;
          const el = (
            <circle
              key={d.name}
              cx="70" cy="70" r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="18"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 70 70)"
            />
          );
          offset += len;
          return el;
        })}
        <circle cx="70" cy="70" r="38" fill="rgb(var(--surface))" />
        <text x="70" y="66" textAnchor="middle" className="fill-ink" fontSize="15" fontWeight="700">
          {data.length}
        </text>
        <text x="70" y="82" textAnchor="middle" className="fill-ink-faint" fontSize="9">
          PLANS
        </text>
      </svg>
      <div className="space-y-2 min-w-0">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
            <span className="text-ink-soft truncate">{d.name}</span>
            <span className="ml-auto font-semibold tabular-nums">{d.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Funnel({ stages }: { stages: { stage: string; value: number }[] }) {
  const max = stages[0].value;
  return (
    <div className="space-y-2">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const change = i > 0 && stages[i - 1].value ? Math.round((1 - s.value / stages[i - 1].value) * 100) : null;
        return (
          <div key={s.stage} className="flex items-center gap-3">
            <span className="w-24 sm:w-28 shrink-0 text-[12px] text-ink-soft">{s.stage}</span>
            <div className="flex-1 h-8 rounded-lg bg-wash overflow-hidden relative">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${Math.max(3, pct)}%`,
                  background: `color-mix(in srgb, rgb(var(--ember)) ${Math.round(100 - i * 9)}%, rgb(var(--invbg)))`,
                }}
              />
            </div>
            <span className="w-16 text-right text-[12px] tabular-nums font-medium shrink-0">
              {s.value.toLocaleString("en-US")}
            </span>
            <span className="w-12 text-right text-[11px] tabular-nums text-ink-faint shrink-0">
              {change === null ? "" : change >= 0 ? `-${change}%` : `+${-change}%`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function CohortTable({
  cohorts,
}: {
  cohorts: { week: string; size: number; d1: number | null; d3: number | null; d7: number | null; d14: number | null; d30: number | null }[];
}) {
  const cells: (keyof (typeof cohorts)[0])[] = ["d1", "d3", "d7", "d14", "d30"];
  const shade = (v: number | null) => {
    if (v === null || v === undefined) return "bg-wash text-ink-faint";
    const t = Math.min(1, v / 40);
    const alpha = 0.08 + t * 0.5;
    return ``;
  };
  return (
    <div className="overflow-x-auto rounded-2xl ring-1 ring-line">
      <table className="w-full text-[12.5px] min-w-[520px]">
        <thead>
          <tr className="bg-wash text-left text-[11px] font-semibold tracking-wide text-ink-mute uppercase">
            <th className="px-4 py-3">Cohort week</th>
            <th className="px-4 py-3">Users</th>
            {cells.map((c) => (
              <th key={c} className="px-4 py-3">{c.toUpperCase()}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {cohorts.map((c) => (
            <tr key={c.week}>
              <td className="px-4 py-3 font-medium whitespace-nowrap">{c.week}</td>
              <td className="px-4 py-3 tabular-nums text-ink-soft">{c.size.toLocaleString("en-US")}</td>
              {cells.map((k) => {
                const v = c[k] as number | null;
                const t = v === null ? 0 : Math.min(1, v / 40);
                return (
                  <td key={k} className="px-4 py-3 tabular-nums" style={v !== null ? { background: `rgb(var(--ember) / ${(0.06 + t * 0.42).toFixed(3)})` } : undefined}>
                    <span className={v === null ? "text-ink-faint" : v > 20 ? "text-white font-semibold" : "text-ink-soft font-medium"}>
                      {v === null ? "—" : `${v}%`}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AdminShell, Loading, useConsole } from "@/components/admin/shell";
import { api } from "@/lib/client/api";
import { Button } from "@/components/ui";
import { Check, Loader2, Settings as SettingsIcon } from "@/components/icons";
import { cn } from "@/lib/utils";

interface SettingsData {
  settings: Record<string, any>;
  defaults: Record<string, any>;
  runtime: { storageDriver: string; cdn: string | null; gateway: string; gateways: string[]; ladder: number[]; dataDir: string; siteUrl: string };
}

const GROUPS: { title: string; note: string; keys: string[] }[] = [
  { title: "Site", note: "Public-facing switches", keys: ["site.name", "site.tagline", "site.registrationOpen", "site.maintenance"] },
  { title: "Catalogue", note: "Defaults applied to new series", keys: ["catalog.freeEpisodesDefault", "catalog.autoPublishOnApprove"] },
  { title: "Payments", note: "Gateway + pricing defaults", keys: ["pay.gateway", "pay.currency", "pay.ppeDefaultCents"] },
  { title: "Creators", note: "Revenue share and payout policy", keys: ["creator.shareBps", "creator.payoutDay", "creator.minPayoutCents"] },
  { title: "Moderation", note: "Queue and comment filters", keys: ["moderation.autoQueueNewSeries", "moderation.commentFilter"] },
  { title: "Player", note: "Playback behaviour", keys: ["player.preloadNext", "player.danmakuEnabled"] },
];

export default function AdminSettings() {
  const { permissions, user } = useConsole();
  const [data, setData] = useState<SettingsData | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    void api.get<SettingsData>("/api/admin/settings").then((d) => {
      setData(d);
      setDraft(d.settings);
    }).catch(() => {});
  }, [user]);

  const canWrite = permissions.includes("settings.write");
  const dirty = data ? JSON.stringify(draft) !== JSON.stringify(data.settings) : false;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.patch<SettingsData>("/api/admin/settings", draft);
      setData((d) => (d ? { ...d, settings: res.settings } : d));
      setDraft(res.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      title="System settings"
      sub={canWrite ? "Owner-level configuration — changes take effect immediately" : "Read-only: settings changes require the owner role"}
      actions={canWrite && (
        <Button size="md" onClick={save} disabled={busy || !dirty}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" strokeWidth={2.6} /> : null}
          {saved ? "Saved" : "Save changes"}
        </Button>
      )}
    >
      {!data ? (
        <Loading />
      ) : (
        <>
          <section className="rounded-2xl ring-1 ring-line bg-wash p-5">
            <h2 className="text-[15px] font-semibold flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" strokeWidth={1.9} /> Runtime
            </h2>
            <p className="text-[12px] text-ink-mute mt-1">Set from environment variables — restart to change.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2.5 mt-4 text-[13px]">
              {[
                ["Storage driver", data.runtime.storageDriver],
                ["CDN base", data.runtime.cdn ?? "none (streamed through the app)"],
                ["Payment gateway", data.runtime.gateway],
                ["Available gateways", data.runtime.gateways.join(", ")],
                ["HLS ladder", data.runtime.ladder.map((h) => `${h}p`).join(" · ")],
                ["Site URL", data.runtime.siteUrl],
              ].map(([k, v]) => (
                <div key={k as string} className="flex justify-between gap-4 border-b border-line/60 pb-2">
                  <span className="text-ink-mute">{k}</span>
                  <span className="font-medium text-right truncate">{v}</span>
                </div>
              ))}
            </div>
          </section>

          {error && <p className="text-[13px] text-ember mt-4">{error}</p>}

          <div className="grid lg:grid-cols-2 gap-4 mt-4">
            {GROUPS.map((g) => (
              <section key={g.title} className="rounded-2xl ring-1 ring-line p-5">
                <h2 className="text-[15px] font-semibold">{g.title}</h2>
                <p className="text-[12px] text-ink-mute mt-0.5 mb-4">{g.note}</p>
                <div className="space-y-3">
                  {g.keys.map((key) => {
                    const value = draft[key];
                    const isBool = typeof data.defaults[key] === "boolean";
                    const isNum = typeof data.defaults[key] === "number";
                    return (
                      <label key={key} className="flex items-center gap-4 justify-between">
                        <span className="min-w-0">
                          <span className="block text-[13px] font-medium truncate">{key.split(".")[1].replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}</span>
                          <span className="block text-[11px] text-ink-faint font-mono">{key}</span>
                        </span>
                        {isBool ? (
                          <button
                            type="button"
                            disabled={!canWrite}
                            onClick={() => setDraft({ ...draft, [key]: !value })}
                            className={cn(
                              "w-11 h-6 rounded-full relative transition-colors shrink-0 disabled:opacity-50",
                              value ? "bg-inv" : "bg-line"
                            )}
                          >
                            <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-paper transition-all shadow-card", value ? "left-[22px]" : "left-0.5")} />
                          </button>
                        ) : (
                          <input
                            disabled={!canWrite}
                            type={isNum ? "number" : "text"}
                            value={value ?? ""}
                            onChange={(e) => setDraft({ ...draft, [key]: isNum ? Number(e.target.value) : e.target.value })}
                            className="h-9 w-[190px] rounded-xl bg-wash ring-1 ring-line focus:ring-ink px-3 text-[13px] outline-none transition-shadow disabled:opacity-60 shrink-0"
                          />
                        )}
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          <div className="pb-8" />
        </>
      )}
    </AdminShell>
  );
}

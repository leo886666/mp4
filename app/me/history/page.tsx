"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { History, Play, X } from "@/components/icons";
import { Button, EmptyState, SectionHeader } from "@/components/ui";
import { api } from "@/lib/client/api";
import { useAuth } from "@/lib/auth";
import type { HistoryItem, Paged } from "@/lib/types";

export default function HistoryPage() {
  const { user, ready } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paged<HistoryItem>>("/api/me/history?perPage=60");
      setItems(res.items);
      setTotal(res.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (ready && user) void load();
    else if (ready) setLoading(false);
  }, [ready, user]);

  async function remove(episodeId: string) {
    setItems((prev) => prev.filter((i) => i.episodeId !== episodeId));
    await api.del(`/api/me/history?episodeId=${episodeId}`).catch(() => {});
  }

  async function clearAll() {
    if (!confirm("Clear your entire watch history?")) return;
    setItems([]);
    await api.del("/api/me/history").catch(() => {});
  }

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-10 animate-fade-up">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-[30px] lg:text-[36px] tracking-tight">Watch history</h1>
          {user && (
            <p className="text-[14px] text-ink-mute mt-1.5">
              {total} episode{total === 1 ? "" : "s"} · synced to your account
            </p>
          )}
        </div>
        {items.length > 0 && (
          <button onClick={clearAll} className="text-[13px] text-ink-mute hover:text-ember transition-colors">
            Clear all
          </button>
        )}
      </div>

      {!user && ready ? (
        <EmptyState
          icon={<History className="w-6 h-6" strokeWidth={1.6} />}
          title="Nothing here yet"
          desc="Create a free account and VESPER remembers exactly where you stopped — on every device."
          action={<Button href="/register?next=/me/history">Sign up free</Button>}
        />
      ) : loading ? (
        <div className="mt-8 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[86px] rounded-2xl bg-wash animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<History className="w-6 h-6" strokeWidth={1.6} />}
          title="No history yet"
          desc="Start any series — your progress shows up here."
          action={<Button href="/discover">Browse the catalog</Button>}
        />
      ) : (
        <ul className="mt-7 divide-y divide-line rounded-2xl ring-1 ring-line overflow-hidden">
          {items.map((h) => (
            <li key={h.episodeId} className="group flex items-center gap-4 px-3 sm:px-4 py-3 hover:bg-wash/60 transition-colors">
              <Link href={`/watch/${h.seriesId}?ep=${h.episodeN}`} className="relative w-[68px] h-[92px] rounded-lg overflow-hidden bg-wash ring-1 ring-line shrink-0">
                <Image src={h.cover} alt={h.title} fill sizes="68px" className="object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="w-5 h-5 fill-white text-white" />
                </span>
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/watch/${h.seriesId}?ep=${h.episodeN}`} className="text-[14.5px] font-semibold truncate hover:text-ember transition-colors block">
                  {h.title}
                </Link>
                <p className="text-[12.5px] text-ink-mute mt-0.5">
                  EP {h.episodeN}{h.episodeTitle ? ` · ${h.episodeTitle}` : ""} · {h.percent}% watched
                </p>
                <div className="mt-2 h-[3px] rounded-full bg-line overflow-hidden max-w-[320px]">
                  <div className="h-full bg-ember rounded-full" style={{ width: `${Math.max(2, h.percent)}%` }} />
                </div>
              </div>
              <span className="text-[12px] text-ink-faint hidden sm:block">
                {new Date(h.updatedAt).toLocaleDateString()}
              </span>
              <button
                onClick={() => remove(h.episodeId)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-ink-faint hover:text-ember hover:bg-wash transition-colors shrink-0"
                aria-label="Remove"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="pb-10" />
    </div>
  );
}

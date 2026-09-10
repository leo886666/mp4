"use client";

import Link from "next/link";
import Image from "next/image";
import { Play } from "@/components/icons";
import { SectionHeader } from "@/components/ui";
import type { HistoryItem } from "@/lib/types";

/** Server-rendered from watch_progress — no localStorage, so it follows the account. */
export function ContinueWatching({ items, title = "Continue watching", sub = "Pick up where you left off" }: {
  items: HistoryItem[];
  title?: string;
  sub?: string;
}) {
  if (!items.length) return null;
  return (
    <section className="mt-10">
      <SectionHeader title={title} sub={sub} action={items.length > 4 ? "All history" : undefined} href="/me/history" />
      <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 pb-1">
        {items.map((h) => (
          <Link key={h.episodeId} href={`/watch/${h.seriesId}?ep=${h.episodeN}`} className="group w-[200px] shrink-0">
            <div className="relative rounded-card overflow-hidden ring-1 ring-line shadow-card bg-wash">
              <div className="aspect-[16/10] relative">
                <Image src={h.cover} alt={h.title} fill sizes="200px" className="object-cover" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="w-10 h-10 rounded-full bg-paper/90 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-ink text-ink ml-0.5" />
                </span>
              </span>
              <div className="absolute bottom-0 inset-x-0 px-2.5 pb-2.5 text-white">
                <p className="text-[12px] font-semibold truncate">
                  EP {h.episodeN} · {h.title}
                </p>
                <div className="mt-1.5 h-[3px] rounded-full bg-paper/25 overflow-hidden">
                  <div className="h-full bg-ember rounded-full" style={{ width: `${Math.max(2, h.percent)}%` }} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

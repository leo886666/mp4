"use client";

import Link from "next/link";
import Image from "next/image";
import { Crown, Lock, Star, Eye, ChevronRight } from "@/components/icons";
import { cn, formatViews } from "@/lib/utils";
import { tintFor } from "@/lib/tints";
import type { Drama } from "@/lib/types";

/**
 * Where a poster takes you.
 *  "title" — the detail page (browsing surfaces: Discover, Search, My list)
 *  "watch" — straight into the player, resuming where you stopped
 *            (Home and History: you already know what you want)
 */
export type CardLink = "title" | "watch";

export const linkFor = (id: string, mode: CardLink = "title") =>
  mode === "watch" ? `/watch/${id}` : `/title/${id}`;

/* -------------------------------- DramaCard -------------------------------- */

export function DramaCard({
  drama, priority = false, linkTo = "title",
}: { drama: Drama; priority?: boolean; linkTo?: CardLink }) {
  return (
    <Link href={linkFor(drama.id, linkTo)} className="group block">
      <div
        className="relative rounded-card overflow-hidden shadow-card ring-1 ring-line group-hover:ring-ink-faint/40 transition-shadow img-ph"
        style={{ ["--ph" as string]: tintFor(drama.cover) }}
      >
        <div className="aspect-[3/4] relative">
          <Image
            src={drama.cover}
            alt={drama.title}
            fill
            sizes="(max-width: 640px) 44vw, (max-width: 1024px) 30vw, 220px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            priority={priority}
          />
        </div>
        <div className="absolute top-2 left-2 flex gap-1.5">
          {drama.isNew && (
            <span className="h-5 px-2 inline-flex items-center rounded-full bg-ember text-white text-[10px] font-semibold tracking-wide">
              NEW
            </span>
          )}
          {drama.status === "Ongoing" && (
            <span className="h-5 px-2 inline-flex items-center rounded-full bg-inv/80 backdrop-blur-sm text-white text-[10px] font-semibold tracking-wide">
              ONGOING
            </span>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/55 to-transparent" />
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between text-white">
          <span className="text-[11px] font-medium opacity-90">{drama.episodes} EP</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold">
            <Star className="w-3 h-3 fill-gold text-gold" />
            {drama.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-2.5">
        <h3 className="text-[14px] font-semibold leading-snug truncate group-hover:text-ember transition-colors">
          {drama.title}
        </h3>
        <p className="text-[12px] text-ink-mute mt-1 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
          {formatViews(drama.views)}
          <span className="text-ink-faint">·</span>
          {drama.genreName ?? drama.genre}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------- DramaRail -------------------------------- */

export function DramaRail({ dramas, linkTo = "title" }: { dramas: Drama[]; linkTo?: CardLink }) {
  return (
    <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 pb-1 snap-x">
      {dramas.map((d) => (
        <div key={d.id} className="w-[136px] sm:w-[152px] shrink-0 snap-start">
          <DramaCard drama={d} linkTo={linkTo} />
        </div>
      ))}
    </div>
  );
}

/* -------------------------------- RankedList ------------------------------- */

export function RankedList({
  dramas, offset = 0, linkTo = "title",
}: { dramas: Drama[]; offset?: number; linkTo?: CardLink }) {
  return (
    <ol className="divide-y divide-line">
      {dramas.map((d, i) => (
        <li key={d.id}>
          <Link href={linkFor(d.id, linkTo)} className="group flex items-center gap-4 py-3.5">
            <span
              className={cn(
                "font-display text-[24px] w-8 text-center shrink-0",
                offset + i < 3 ? "text-ember" : "text-ink-faint"
              )}
            >
              {offset + i + 1}
            </span>
            <div className="relative w-[52px] h-[70px] rounded-lg overflow-hidden bg-wash shrink-0 ring-1 ring-line">
              <Image src={d.cover} alt={d.title} fill sizes="52px" className="object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-[14px] font-semibold truncate group-hover:text-ember transition-colors">
                {d.title}
              </h3>
              <p className="text-[12px] text-ink-mute mt-0.5 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" strokeWidth={1.8} />
                {formatViews(d.views)}
                <span className="text-ink-faint">·</span>
                {d.episodes} EP
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-ink-faint group-hover:text-ink transition-colors shrink-0" />
          </Link>
        </li>
      ))}
    </ol>
  );
}

/* --------------------------------- Hero ------------------------------------ */

export function HeroCard({
  drama, tall = false, linkTo = "title",
}: { drama: Drama; tall?: boolean; linkTo?: CardLink }) {
  return (
    <Link href={linkFor(drama.id, linkTo)} className="group relative block overflow-hidden rounded-2xl">
      <div className={cn("relative", tall ? "aspect-[4/5] sm:aspect-[16/10]" : "aspect-[16/10]")}>
        <Image
          src={drama.hero ?? drama.cover}
          alt={drama.title}
          fill
          sizes="(max-width: 1024px) 100vw, 820px"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 text-white">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="h-5 px-2 inline-flex items-center rounded-full bg-ember text-[10px] font-bold tracking-widest">
            HOT
          </span>
          <span className="text-[12px] font-medium opacity-85">{drama.genreName ?? drama.genre}</span>
          <span className="inline-flex items-center gap-1 text-[12px] font-semibold">
            <Star className="w-3 h-3 fill-gold text-gold" />
            {drama.rating.toFixed(1)}
          </span>
        </div>
        <h2 className="font-display text-[26px] sm:text-[34px] leading-[1.1] tracking-tight max-w-[520px]">
          {drama.title}
        </h2>
        <p className="text-[13px] sm:text-sm text-white/75 mt-2 max-w-[440px] leading-relaxed line-clamp-2">
          {drama.synopsis}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <span className="inline-flex items-center h-10 px-6 rounded-full bg-paper text-ink text-[13px] font-semibold group-hover:bg-paper/90 transition-colors">
            Watch now
          </span>
          <span className="text-[12px] opacity-80">
            {drama.episodes} episodes · {drama.freeEpisodes} free
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------- LockOverlay ------------------------------- */

export function LockTag({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-mute">
      <Lock className="w-3.5 h-3.5" />
      {count} VIP
    </span>
  );
}

export function VipDot() {
  return <Crown className="w-3.5 h-3.5 fill-gold text-gold" />;
}

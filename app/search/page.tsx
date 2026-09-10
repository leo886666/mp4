"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X, Flame } from "@/components/icons";
import { DramaCard } from "@/components/cards";
import { EmptyState, SectionHeader, Skeleton } from "@/components/ui";
import { api, track } from "@/lib/client/api";
import type { Drama, Genre } from "@/lib/types";

interface SearchResponse {
  query: string;
  total?: number;
  results: Drama[];
  byCreator?: Drama[];
  suggestions?: Drama[];
  genres: Genre[];
}

function SearchInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}`);
        setData(res);
        if (q.trim()) track("search", { props: { q: q.trim(), results: res.total ?? 0 } });
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-8">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-ink-faint" strokeWidth={1.9} />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search series, tags, studios…"
          className="w-full h-12 rounded-full bg-wash ring-1 ring-line focus:ring-ink pl-11 pr-11 text-[14.5px] outline-none transition-shadow"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-ink-faint hover:text-ink hover:bg-line/60 transition-colors"
            aria-label="Clear"
          >
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        )}
      </div>

      {!q.trim() ? (
        <>
          <section className="mt-8">
            <SectionHeader title="Trending searches" sub="What everyone is looking for" />
            <div className="flex flex-wrap gap-2">
              {(data?.genres ?? []).map((g) => (
                <button
                  key={g.id}
                  onClick={() => router.push(`/discover?genre=${g.id}`)}
                  className="h-8 px-3.5 rounded-full text-[13px] font-medium bg-paper text-ink-soft border border-line hover:border-ink-faint transition-colors"
                >
                  {g.name}
                </button>
              ))}
            </div>
          </section>
          <section className="mt-10">
            <SectionHeader title="Popular right now" sub="Start here" />
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
              {(data?.suggestions ?? []).map((d, i) => <DramaCard key={d.id} drama={d} priority={i < 6} />)}
            </div>
          </section>
        </>
      ) : loading ? (
        <div className="mt-8 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-3.5 w-3/4 mt-2.5" />
            </div>
          ))}
        </div>
      ) : (data?.results.length ?? 0) === 0 ? (
        <EmptyState
          icon={<Flame className="w-6 h-6" strokeWidth={1.6} />}
          title={`Nothing for “${q}”`}
          desc="Try a genre, a studio name, or a tag like “revenge”."
          action={<Link href="/discover" className="text-[13px] font-semibold text-ember">Browse everything →</Link>}
        />
      ) : (
        <>
          <p className="text-[13px] text-ink-mute mt-6">
            {data!.total} result{data!.total === 1 ? "" : "s"} for “{q}”
          </p>
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
            {data!.results.map((d, i) => <DramaCard key={d.id} drama={d} priority={i < 6} />)}
          </div>
          {!!data!.byCreator?.length && (
            <section className="mt-10 pb-10">
              <SectionHeader title="From studios matching your search" />
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
                {data!.byCreator.map((d) => <DramaCard key={d.id} drama={d} />)}
              </div>
            </section>
          )}
        </>
      )}
      <div className="pb-10" />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-mute text-sm">Loading…</div>}>
      <SearchInner />
    </Suspense>
  );
}

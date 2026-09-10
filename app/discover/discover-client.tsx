"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Segmented, Skeleton, EmptyState } from "@/components/ui";
import { DramaCard } from "@/components/cards";
import { Compass } from "@/components/icons";
import { api, track } from "@/lib/client/api";
import type { Drama, Genre, Paged } from "@/lib/types";

export function DiscoverClient({ initialGenres }: { initialGenres: Genre[] }) {
  const params = useSearchParams();
  const [genre, setGenre] = useState(params.get("genre") ?? "all");
  const [sort, setSort] = useState(params.get("sort") ?? "trending");
  const [items, setItems] = useState<Drama[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (nextPage: number, replace: boolean) => {
      setLoading(true);
      try {
        const q = new URLSearchParams({ sort, page: String(nextPage), perPage: "24" });
        if (genre !== "all") q.set("genre", genre);
        const res = await api.get<Paged<Drama>>(`/api/series?${q}`);
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(res.page);
      } finally {
        setLoading(false);
      }
    },
    [genre, sort]
  );

  useEffect(() => {
    void load(1, true);
    track("search", { props: { genre, sort } });
  }, [genre, sort, load]);

  const genreName = useMemo(() => initialGenres.find((g) => g.id === genre)?.name, [genre, initialGenres]);
  const hasMore = items.length < total;

  return (
    <div className="mx-auto max-w-[1200px] px-5 lg:px-8 pt-6 lg:pt-8">
      <h1 className="font-display text-[30px] lg:text-[36px] tracking-tight">Discover</h1>
      <p className="text-[14px] text-ink-mute mt-1.5">
        {initialGenres.reduce((a, g) => a + (g.count ?? 0), 0)} series · {initialGenres.length} genres · updated daily
      </p>

      <div className="mt-6 flex gap-2 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0 pb-1">
        <button
          onClick={() => setGenre("all")}
          className={`h-8 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
            genre === "all" ? "bg-inv text-white" : "bg-paper text-ink-soft border border-line hover:border-ink-faint"
          }`}
        >
          All
        </button>
        {initialGenres.map((g) => (
          <button
            key={g.id}
            onClick={() => setGenre(g.id)}
            className={`h-8 px-3.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
              genre === g.id ? "bg-inv text-white" : "bg-paper text-ink-soft border border-line hover:border-ink-faint"
            }`}
          >
            {g.name}
            {g.count !== undefined && <span className="ml-1.5 text-[11px] opacity-60">{g.count}</span>}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-[13px] text-ink-mute">
          {total} series{genre !== "all" && genreName ? ` in ${genreName}` : ""}
        </p>
        <Segmented
          options={[
            { id: "trending", label: "Trending" },
            { id: "new", label: "Newest" },
            { id: "rating", label: "Top rated" },
          ]}
          value={sort}
          onChange={setSort}
        />
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="h-3.5 w-3/4 mt-2.5" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={<Compass className="w-6 h-6" strokeWidth={1.6} />} title="Nothing here yet" desc="No series in this genre — try another mood." />
      ) : (
        <>
          <div className="mt-6 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-4 gap-y-6 cv-auto">
            {items.map((d, i) => (
              <DramaCard key={d.id} drama={d} priority={i < 6} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-10">
              <button
                onClick={() => load(page + 1, false)}
                disabled={loading}
                className="h-11 px-7 rounded-full border border-line text-[13.5px] font-medium hover:border-ink-faint transition-colors disabled:opacity-50"
              >
                {loading ? "Loading…" : `Load more (${total - items.length} left)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

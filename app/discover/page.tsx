import { Suspense } from "react";
import { DiscoverClient } from "./discover-client";
import { genres } from "@/lib/server/repo/catalog";
import { count } from "@/lib/server/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function DiscoverPage() {
  const list = genres().map((g) => ({
    id: g.id,
    name: g.name,
    count: count("SELECT COUNT(*) FROM series WHERE genre_id = ? AND status = 'published'", g.id),
  }));
  return (
    <Suspense fallback={<div className="py-20 text-center text-ink-mute text-sm">Loading…</div>}>
      <DiscoverClient initialGenres={list} />
    </Suspense>
  );
}

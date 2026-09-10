import { ok, route } from "@/lib/server/http";
import { count } from "@/lib/server/db";
import { genres } from "@/lib/server/repo/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const rows = genres().map((g) => ({
    id: g.id,
    name: g.name,
    count: count("SELECT COUNT(*) FROM series WHERE genre_id = ? AND status = 'published'", g.id),
  }));
  return ok({ genres: rows });
});

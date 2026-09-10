import { ok, route } from "@/lib/server/http";
import { all } from "@/lib/server/db";
import { listSeries, genres, type SeriesRow } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) {
    return ok({
      query: "",
      results: [],
      suggestions: seriesListDTO(listSeries({ status: "published", sort: "trending", limit: 8, offset: 0 }).rows),
      genres: genres().map((g) => ({ id: g.id, name: g.name })),
    });
  }
  const { rows, total } = listSeries({ q, status: "published", sort: "trending", limit: 40, offset: 0 });
  const creators = all<SeriesRow>(
    `SELECT s.*, c.name AS creator_name, g.name AS genre_name FROM series s
     LEFT JOIN creators c ON c.id = s.creator_id LEFT JOIN genres g ON g.id = s.genre_id
     WHERE s.status='published' AND c.name LIKE ? LIMIT 8`,
    `%${q}%`
  );
  return ok({
    query: q,
    total,
    results: seriesListDTO(rows),
    byCreator: seriesListDTO(creators),
    genres: genres().filter((g) => g.name.toLowerCase().includes(q.toLowerCase())).map((g) => ({ id: g.id, name: g.name })),
  });
});

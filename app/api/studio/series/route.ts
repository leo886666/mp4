import { body, num, ok, oneOf, route, str } from "@/lib/server/http";
import { requireCreator } from "@/lib/server/services/studio";
import { createSeries, genres, listSeries } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";
import { getSetting } from "@/lib/server/repo/ops";
import { placeholderCover } from "@/lib/placeholders";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: Request) => {
  const { creator } = await requireCreator();
  const status = new URL(req.url).searchParams.get("status") ?? undefined;
  const { rows, total } = listSeries({ creatorId: creator.id, status, limit: 100, offset: 0, sort: "updated" });
  return ok({ items: seriesListDTO(rows), total, genres: genres() });
});

export const POST = route(async (req: Request) => {
  const { user, creator } = await requireCreator();
  const data = await body(req);
  const title = str(data.title, "title", { min: 2, max: 80 });
  const genreId = oneOf(data.genre, "genre", genres().map((g) => g.id) as [string, ...string[]]);

  const series = createSeries({
    title,
    genreId,
    creatorId: creator.id,
    synopsis: str(data.synopsis, "synopsis", { optional: true, max: 1200 }),
    tags: Array.isArray(data.tags) ? data.tags.slice(0, 6).map((t: any) => String(t).slice(0, 24)) : [],
    // never blank: fall back to a shipped cover until the creator uploads one
    coverUrl: str(data.cover, "cover", { optional: true }) || placeholderCover(title),
    freeEpisodes: num(data.freeEpisodes, "freeEpisodes", { optional: true, def: getSetting<number>("catalog.freeEpisodesDefault"), min: 0, max: 20 }),
    monetization: oneOf(data.monetization, "monetization", ["free", "vip", "ppe"] as const, "vip"),
    ppePriceCents: Math.round(num(data.ppePrice, "ppePrice", { optional: true, def: getSetting<number>("pay.ppeDefaultCents") / 100 }) * 100),
    status: "draft",
  });

  audit({ actorId: user.id, actorName: user.name, action: "series.create", targetType: "series", targetId: series.id, detail: { title } });
  return ok({ series: seriesListDTO([series])[0] });
});

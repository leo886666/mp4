import { body, ok, route, str } from "@/lib/server/http";
import { requirePerm } from "@/lib/server/session";
import { deleteBanner, deleteRail, listBannersAdmin, listRailsAdmin, upsertBanner, upsertRail } from "@/lib/server/repo/ops";
import { listSeries } from "@/lib/server/repo/catalog";
import { seriesListDTO } from "@/lib/server/dto";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  await requirePerm("content.read");
  return ok({
    rails: listRailsAdmin(),
    banners: listBannersAdmin(),
    candidates: seriesListDTO(listSeries({ status: "published", sort: "trending", limit: 40, offset: 0 }).rows),
  });
});

export const POST = route(async (req: Request) => {
  const operator = await requirePerm("content.write");
  const data = await body(req);
  const type = str(data.type, "type");
  if (type === "rail") {
    const id = upsertRail({
      id: data.id, title: str(data.title, "title", { max: 60 }), subtitle: str(data.subtitle, "subtitle", { optional: true, max: 90 }),
      kind: str(data.kind, "kind"), param: str(data.param, "param", { optional: true }), ids: Array.isArray(data.ids) ? data.ids : [],
      sort: Number(data.sort ?? 0), active: data.active !== false,
    });
    audit({ actorId: operator.id, actorName: operator.name, action: "curation.rail", targetId: id, detail: data });
    return ok({ id });
  }
  if (type === "banner") {
    const id = upsertBanner({
      id: data.id, title: str(data.title, "title", { max: 80 }), subtitle: str(data.subtitle, "subtitle", { optional: true, max: 200 }),
      seriesId: data.seriesId ?? null, imageUrl: str(data.imageUrl, "imageUrl", { max: 400 }), link: str(data.link, "link", { optional: true }),
      sort: Number(data.sort ?? 0), active: data.active !== false,
    });
    audit({ actorId: operator.id, actorName: operator.name, action: "curation.banner", targetId: id, detail: data });
    return ok({ id });
  }
  if (type === "delete-rail") deleteRail(str(data.id, "id"));
  if (type === "delete-banner") deleteBanner(str(data.id, "id"));
  return ok({ deleted: true });
});

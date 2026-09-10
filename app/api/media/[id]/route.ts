import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { notFound, ok, route } from "@/lib/server/http";
import { getAsset, variantsOf } from "@/lib/server/repo/media";
import { contentTypeFor, storage } from "@/lib/server/storage";
import { sign } from "@/lib/server/crypto";
import { env } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Asset status (polled while transcoding) or the raw image bytes. */
export const GET = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const asset = getAsset(params.id);
  if (!asset) throw notFound("Media not found");

  if (new URL(req.url).searchParams.get("raw") === "1" && asset.kind === "image" && asset.source_key) {
    const store = storage();
    const cdn = store.publicUrl(asset.source_key);
    if (cdn) return NextResponse.redirect(cdn, 302);
    const stream = await store.stream(asset.source_key);
    return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
      headers: { "content-type": contentTypeFor(asset.source_key), "cache-control": "public, max-age=31536000, immutable" },
    });
  }

  const token = sign({ a: asset.id, e: "", u: "preview" }, env.playTokenSeconds);
  return ok({
    id: asset.id,
    kind: asset.kind,
    status: asset.status,
    error: asset.error,
    durationS: asset.duration_s,
    width: asset.width,
    height: asset.height,
    variants: variantsOf(asset).map((v) => v.height),
    poster: asset.poster_key ? `/api/stream/${asset.id}/poster.jpg?t=${encodeURIComponent(token)}` : null,
    preview: asset.hls_key ? `/api/stream/${asset.id}/hls/master.m3u8?t=${encodeURIComponent(token)}` : null,
    imageUrl: asset.kind === "image" ? `/api/media/${asset.id}?raw=1` : null,
  });
});

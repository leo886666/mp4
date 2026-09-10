import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { forbidden, notFound, route } from "@/lib/server/http";
import { verify } from "@/lib/server/crypto";
import { getAsset } from "@/lib/server/repo/media";
import { contentTypeFor, mediaKey, storage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Token-gated media delivery with byte-range support.
 *
 * Playlists are rewritten on the fly so every segment URL carries the same
 * token — a leaked .m3u8 is useless once the token expires. With a CDN
 * configured (VESPER_CDN_BASE) this route 302s to signed CDN URLs instead of
 * proxying bytes.
 */
export const GET = route(async (req: Request, ctx: { params: Promise<{ assetId: string; path: string[] }> }) => {
    const params = await ctx.params;
  const url = new URL(req.url);
  const token = url.searchParams.get("t") || "";
  const claims = verify<{ a: string; e: string; u: string }>(token);
  if (!claims || (claims.a && claims.a !== params.assetId)) throw forbidden("Playback token is invalid or expired");

  const asset = getAsset(params.assetId);
  if (!asset) throw notFound("Media not found");

  const rel = params.path.join("/");
  const key = mediaKey(asset.id, rel);
  const store = storage();
  if (!(await store.exists(key))) throw notFound("Media file not found");

  const type = contentTypeFor(rel);

  // Playlists: inject the token into every child URL.
  if (rel.endsWith(".m3u8")) {
    const text = (await store.get(key)).toString("utf8");
    const dir = rel.includes("/") ? rel.slice(0, rel.lastIndexOf("/") + 1) : "";
    const rewritten = text
      .split("\n")
      .map((line) => {
        const l = line.trim();
        if (!l || l.startsWith("#")) return line;
        return `/api/stream/${asset.id}/${dir}${l}?t=${encodeURIComponent(token)}`;
      })
      .join("\n");
    return new NextResponse(rewritten, {
      headers: { "content-type": type, "cache-control": "no-store" },
    });
  }

  const cdn = store.publicUrl(key);
  if (cdn) return NextResponse.redirect(cdn, 302);

  const size = await store.size(key);
  const range = req.headers.get("range");
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range);
    const start = m && m[1] ? parseInt(m[1], 10) : 0;
    const end = m && m[2] ? parseInt(m[2], 10) : Math.min(size - 1, start + 2 * 1024 * 1024 - 1);
    const stream = await store.stream(key, { start, end });
    return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
      status: 206,
      headers: {
        "content-type": type,
        "content-length": String(end - start + 1),
        "content-range": `bytes ${start}-${end}/${size}`,
        "accept-ranges": "bytes",
        "cache-control": "private, max-age=3600",
      },
    });
  }

  const stream = await store.stream(key);
  return new NextResponse(Readable.toWeb(stream) as unknown as ReadableStream, {
    headers: {
      "content-type": type,
      "content-length": String(size),
      "accept-ranges": "bytes",
      "cache-control": "private, max-age=3600",
    },
  });
});

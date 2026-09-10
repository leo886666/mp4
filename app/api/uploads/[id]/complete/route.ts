import path from "node:path";
import { badRequest, forbidden, notFound, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { createAsset, getUpload, patchAsset, patchUpload } from "@/lib/server/repo/media";
import { mediaKey, storage } from "@/lib/server/storage";
import { queueTranscode } from "@/lib/server/media";
import { audit } from "@/lib/server/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Resumable upload, step 3: stitch the parts into the media asset and hand it
 * to the transcoder. (Production on S3 would finish a real multipart upload
 * here instead of concatenating — same call site, different driver.)
 */
export const POST = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
    const params = await ctx.params;
  const user = await requireUser("site");
  const upload = getUpload(params.id);
  if (!upload) throw notFound("Upload session not found");
  if (upload.user_id !== user.id) throw forbidden();
  if (!upload.parts) throw badRequest("No parts were uploaded");

  const isImage = (upload.mime || "").startsWith("image/");
  const asset = createAsset({
    kind: isImage ? "image" : "video",
    ownerId: user.id,
    status: isImage ? "ready" : "queued",
    original_name: upload.filename,
    mime: upload.mime,
    bytes: upload.bytes_done,
  });

  const ext = path.extname(upload.filename || "") || (isImage ? ".jpg" : ".mp4");
  const key = mediaKey(asset.id, `source${ext}`);
  const store = storage();

  const chunks: Buffer[] = [];
  for (let i = 0; i < upload.parts; i++) {
    const partKey = `uploads/${upload.id}/part-${String(i).padStart(5, "0")}`;
    if (!(await store.exists(partKey))) throw badRequest(`Missing part ${i} — re-upload it and complete again`);
    chunks.push(await store.get(partKey));
  }
  await store.put(key, Buffer.concat(chunks), upload.mime || undefined);
  for (let i = 0; i < upload.parts; i++) {
    await store.remove(`uploads/${upload.id}/part-${String(i).padStart(5, "0")}`).catch(() => {});
  }

  patchUpload(upload.id, { status: "complete", storage_key: key });
  patchAsset(asset.id, isImage ? { source_key: key, poster_key: key } : { source_key: key });

  let jobId: string | null = null;
  if (!isImage) jobId = queueTranscode(asset.id);

  audit({ actorId: user.id, actorName: user.name, action: "media.upload", targetType: "media", targetId: asset.id, detail: { filename: upload.filename, bytes: upload.bytes_done } });

  return ok({
    mediaId: asset.id,
    kind: asset.kind,
    status: isImage ? "ready" : "queued",
    jobId,
    url: isImage ? `/api/media/${asset.id}?raw=1` : null,
  });
});

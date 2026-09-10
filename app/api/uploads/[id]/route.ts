import { badRequest, forbidden, notFound, ok, route } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { getUpload, patchUpload } from "@/lib/server/repo/media";
import { storage } from "@/lib/server/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Resumable upload, step 2: one part per request. */
export const PUT = route(async (req: Request, { params }: { params: { id: string } }) => {
  const user = requireUser("site");
  const upload = getUpload(params.id);
  if (!upload) throw notFound("Upload session not found");
  if (upload.user_id !== user.id) throw forbidden();
  if (upload.status !== "open") throw badRequest("Upload session is closed");

  const part = parseInt(new URL(req.url).searchParams.get("part") || "0", 10);
  if (!Number.isInteger(part) || part < 0) throw badRequest("part must be a non-negative integer");

  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length) throw badRequest("Empty part");
  await storage().put(`uploads/${upload.id}/part-${String(part).padStart(5, "0")}`, buf);

  const updated = patchUpload(upload.id, { bytes_done: upload.bytes_done + buf.length, parts: Math.max(upload.parts, part + 1) });
  return ok({
    part,
    received: buf.length,
    bytesDone: updated!.bytes_done,
    percent: upload.bytes_total ? Math.min(100, Math.round((updated!.bytes_done / upload.bytes_total) * 100)) : 0,
  });
});

export const GET = route(async (_req: Request, { params }: { params: { id: string } }) => {
  const upload = getUpload(params.id);
  if (!upload) throw notFound("Upload session not found");
  return ok({
    id: upload.id,
    status: upload.status,
    bytesDone: upload.bytes_done,
    bytesTotal: upload.bytes_total,
    percent: upload.bytes_total ? Math.round((upload.bytes_done / upload.bytes_total) * 100) : 0,
  });
});

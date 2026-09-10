import { body, num, ok, oneOf, route, str } from "@/lib/server/http";
import { requireUser } from "@/lib/server/session";
import { createUpload } from "@/lib/server/repo/media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = ["video", "image"] as const;
const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

/**
 * Resumable upload, step 1.
 *
 * The client slices the file and PUTs each part to /api/uploads/[id]?part=n;
 * parts are stored independently so a dropped connection only costs one chunk.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser("site");
  const data = await body(req);
  const kind = oneOf(data.kind, "kind", KINDS, "video");
  const filename = str(data.filename, "filename", { max: 200 });
  const size = num(data.size, "size", { min: 1, max: MAX_BYTES });
  const mime = str(data.mime, "mime", { optional: true }) || (kind === "video" ? "video/mp4" : "image/jpeg");

  const upload = createUpload({ userId: user.id, filename, mime, bytesTotal: size, storageKey: "" });
  return ok({
    uploadId: upload.id,
    partSize: 4 * 1024 * 1024,
    parts: Math.ceil(size / (4 * 1024 * 1024)),
    putUrl: `/api/uploads/${upload.id}`,
    completeUrl: `/api/uploads/${upload.id}/complete`,
  });
});

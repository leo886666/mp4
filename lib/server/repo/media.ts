import { all, get, insert, json, now, update } from "../db";
import { newId } from "../ids";

export interface MediaRow {
  id: string;
  kind: "video" | "image";
  owner_id: string | null;
  status: "queued" | "processing" | "ready" | "failed";
  original_name: string | null;
  mime: string | null;
  bytes: number;
  duration_s: number;
  width: number;
  height: number;
  source_key: string | null;
  hls_key: string | null;
  mp4_key: string | null;
  poster_key: string | null;
  sprite_key: string | null;
  variants: string;
  error: string | null;
  created_at: number;
  updated_at: number;
}

export interface Variant { height: number; bandwidth: number; key: string }

export function createAsset(input: Partial<MediaRow> & { kind?: "video" | "image"; ownerId?: string | null }): MediaRow {
  const id = input.id ?? newId("med");
  const ts = now();
  insert("media_assets", {
    id,
    kind: input.kind ?? "video",
    owner_id: input.ownerId ?? null,
    status: input.status ?? "queued",
    original_name: input.original_name ?? null,
    mime: input.mime ?? null,
    bytes: input.bytes ?? 0,
    duration_s: input.duration_s ?? 0,
    width: input.width ?? 0,
    height: input.height ?? 0,
    source_key: input.source_key ?? null,
    hls_key: input.hls_key ?? null,
    mp4_key: input.mp4_key ?? null,
    poster_key: input.poster_key ?? null,
    sprite_key: input.sprite_key ?? null,
    variants: input.variants ?? "[]",
    error: null,
    created_at: ts,
    updated_at: ts,
  });
  return getAsset(id)!;
}

export function getAsset(id: string): MediaRow | null {
  return get<MediaRow>("SELECT * FROM media_assets WHERE id = ?", id);
}

export function patchAsset(id: string, patch: Record<string, any>) {
  update("media_assets", id, { ...patch, updated_at: now() });
  return getAsset(id);
}

export function variantsOf(a: MediaRow): Variant[] {
  return json<Variant[]>(a.variants, []);
}

export function listAssets(limit = 50) {
  return all<MediaRow>("SELECT * FROM media_assets ORDER BY created_at DESC LIMIT ?", limit);
}

export function mediaSummary() {
  return {
    total: all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM media_assets GROUP BY status"),
  };
}

/* --------------------------------- uploads -------------------------------- */

export interface UploadRow {
  id: string;
  user_id: string | null;
  filename: string | null;
  mime: string | null;
  bytes_total: number;
  bytes_done: number;
  parts: number;
  storage_key: string | null;
  status: "open" | "complete" | "aborted";
  created_at: number;
  updated_at: number;
}

export function createUpload(input: { userId: string; filename: string; mime: string; bytesTotal: number; storageKey: string }): UploadRow {
  const id = newId("upl");
  const ts = now();
  insert("uploads", {
    id,
    user_id: input.userId,
    filename: input.filename,
    mime: input.mime,
    bytes_total: input.bytesTotal,
    bytes_done: 0,
    parts: 0,
    storage_key: input.storageKey,
    status: "open",
    created_at: ts,
    updated_at: ts,
  });
  return getUpload(id)!;
}

export function getUpload(id: string): UploadRow | null {
  return get<UploadRow>("SELECT * FROM uploads WHERE id = ?", id);
}

export function patchUpload(id: string, patch: Record<string, any>) {
  update("uploads", id, { ...patch, updated_at: now() });
  return getUpload(id);
}

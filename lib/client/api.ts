"use client";

/**
 * Typed fetch wrapper for every browser -> API call.
 *
 * The server always answers { ok, data } | { ok, error }; this unwraps it and
 * turns failures into a single ApiError with the machine-readable code intact
 * (402 payment_required carries the unlock path the paywall needs).
 */

export class ApiError extends Error {
  status: number;
  code: string;
  details: any;
  constructor(status: number, code: string, message: string, details?: any) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(method: string, path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: "same-origin",
    headers: body instanceof Uint8Array || body instanceof Blob ? init.headers : { "content-type": "application/json", ...(init.headers || {}) },
    body: body === undefined ? undefined : body instanceof Uint8Array || body instanceof Blob ? (body as any) : JSON.stringify(body),
    ...init,
  });
  const text = await res.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new ApiError(res.status, "bad_response", "Server returned a malformed response");
  }
  if (!res.ok || !payload?.ok) {
    const err = payload?.error ?? {};
    throw new ApiError(res.status, err.code ?? "error", err.message ?? `Request failed (${res.status})`, err.details);
  }
  return payload.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  put: <T>(path: string, body?: unknown, init?: RequestInit) => request<T>("PUT", path, body, init),
  del: <T>(path: string) => request<T>("DELETE", path),
};

/* --------------------------------- telemetry ------------------------------ */

type QueuedEvent = { name: string; seriesId?: string; episodeId?: string; value?: number; props?: Record<string, unknown> };
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Fire-and-forget analytics; batched so a binge session isn't 200 requests. */
export function track(name: string, payload: Omit<QueuedEvent, "name"> = {}) {
  queue.push({ name, ...payload });
  if (flushTimer) return;
  flushTimer = setTimeout(flushEvents, 4000);
}

export function flushEvents() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!queue.length) return;
  const events = queue;
  queue = [];
  const blob = JSON.stringify({ events });
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    navigator.sendBeacon("/api/events", new Blob([blob], { type: "application/json" }));
  } else {
    void fetch("/api/events", { method: "POST", headers: { "content-type": "application/json" }, body: blob, keepalive: true });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("pagehide", flushEvents);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushEvents();
  });
}

/* ------------------------------ resumable upload -------------------------- */

export interface UploadResult {
  mediaId: string;
  kind: "video" | "image";
  status: string;
  jobId: string | null;
  url: string | null;
}

/** Slices the file, PUTs each part, reports progress, then completes. */
export async function uploadFile(
  file: File,
  opts: { kind?: "video" | "image"; onProgress?: (percent: number) => void } = {}
): Promise<UploadResult> {
  const kind = opts.kind ?? (file.type.startsWith("image/") ? "image" : "video");
  const init = await api.post<{ uploadId: string; partSize: number; parts: number }>("/api/uploads", {
    filename: file.name,
    size: file.size,
    mime: file.type || (kind === "image" ? "image/jpeg" : "video/mp4"),
    kind,
  });

  for (let part = 0; part < init.parts; part++) {
    const slice = file.slice(part * init.partSize, (part + 1) * init.partSize);
    const buf = new Uint8Array(await slice.arrayBuffer());
    const res = await api.put<{ percent: number }>(`/api/uploads/${init.uploadId}?part=${part}`, buf, {
      headers: { "content-type": "application/octet-stream" },
    });
    opts.onProgress?.(Math.min(99, res.percent));
  }

  const done = await api.post<UploadResult>(`/api/uploads/${init.uploadId}/complete`, {});
  opts.onProgress?.(100);
  return done;
}

/** Polls a queued media asset until the transcoder finishes. */
export async function waitForMedia(mediaId: string, onTick?: (status: string) => void, timeoutMs = 300_000) {
  const started = Date.now();
  for (;;) {
    const asset = await api.get<{ status: string; error?: string | null; durationS: number; poster: string | null }>(`/api/media/${mediaId}`);
    onTick?.(asset.status);
    if (asset.status === "ready" || asset.status === "failed") return asset;
    if (Date.now() - started > timeoutMs) return asset;
    await new Promise((r) => setTimeout(r, 1500));
  }
}

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash, createHmac } from "node:crypto";
import { Readable } from "node:stream";
import { env } from "./env";

/**
 * Object storage seam.
 *
 * `local` writes under $VESPER_DATA_DIR (dev / single box). `s3` speaks plain
 * SigV4 against any S3-compatible endpoint (AWS S3, Cloudflare R2, MinIO) with
 * no SDK dependency. Media keys look identical in both drivers, so flipping
 * VESPER_STORAGE_DRIVER=s3 + VESPER_CDN_BASE is the whole production migration.
 */

export interface StorageDriver {
  readonly name: string;
  put(key: string, data: Buffer | string, contentType?: string): Promise<void>;
  putFile(key: string, filePath: string, contentType?: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  stream(key: string, range?: { start: number; end: number }): Promise<Readable>;
  exists(key: string): Promise<boolean>;
  size(key: string): Promise<number>;
  remove(key: string): Promise<void>;
  /** Local absolute path when the driver is disk-backed (ffmpeg needs one). */
  localPath(key: string): string | null;
  /** Public URL when a CDN is configured, else null => stream through the app. */
  publicUrl(key: string): string | null;
}

/* --------------------------------- local ---------------------------------- */

class LocalDriver implements StorageDriver {
  readonly name = "local";
  private root = env.dataDir;

  private abs(key: string) {
    const p = path.join(this.root, key);
    if (!p.startsWith(this.root)) throw new Error("path traversal blocked");
    return p;
  }

  async put(key: string, data: Buffer | string, _contentType?: string) {
    const p = this.abs(key);
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.writeFile(p, data);
  }

  async putFile(key: string, filePath: string) {
    const p = this.abs(key);
    await fsp.mkdir(path.dirname(p), { recursive: true });
    await fsp.copyFile(filePath, p);
  }

  async get(key: string) {
    return fsp.readFile(this.abs(key));
  }

  async stream(key: string, range?: { start: number; end: number }) {
    return fs.createReadStream(this.abs(key), range);
  }

  async exists(key: string) {
    try {
      await fsp.access(this.abs(key));
      return true;
    } catch {
      return false;
    }
  }

  async size(key: string) {
    const s = await fsp.stat(this.abs(key));
    return s.size;
  }

  async remove(key: string) {
    await fsp.rm(this.abs(key), { force: true, recursive: true });
  }

  localPath(key: string) {
    return this.abs(key);
  }

  publicUrl(key: string) {
    return env.cdnBase ? `${env.cdnBase.replace(/\/$/, "")}/${key}` : null;
  }
}

/* ----------------------------------- s3 ----------------------------------- */

function sha256hex(data: Buffer | string) {
  return createHash("sha256").update(data).digest("hex");
}
function hmac(key: Buffer | string, data: string) {
  return createHmac("sha256", key).update(data).digest();
}

class S3Driver implements StorageDriver {
  readonly name = "s3";

  private endpoint() {
    const { endpoint, region, bucket } = env.s3;
    if (endpoint) return `${endpoint.replace(/\/$/, "")}/${bucket}`;
    return `https://${bucket}.s3.${region}.amazonaws.com`;
  }

  /** Minimal SigV4 request signer (single-chunk payload). */
  private async request(method: string, key: string, body?: Buffer, contentType?: string, extraHeaders: Record<string, string> = {}) {
    const url = new URL(`${this.endpoint()}/${key.replace(/^\//, "")}`);
    const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, "");
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256hex(body ?? "");
    const headers: Record<string, string> = {
      host: url.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...extraHeaders,
    };
    if (contentType) headers["content-type"] = contentType;

    const signedHeaders = Object.keys(headers).map((h) => h.toLowerCase()).sort();
    const canonicalHeaders = signedHeaders.map((h) => `${h}:${headers[h]}\n`).join("");
    const canonical = [method, url.pathname, url.searchParams.toString(), canonicalHeaders, signedHeaders.join(";"), payloadHash].join("\n");
    const scope = `${dateStamp}/${env.s3.region || "auto"}/s3/aws4_request`;
    const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonical)].join("\n");
    const kDate = hmac(`AWS4${env.s3.secretKey}`, dateStamp);
    const kRegion = hmac(kDate, env.s3.region || "auto");
    const kService = hmac(kRegion, "s3");
    const kSigning = hmac(kService, "aws4_request");
    const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
    headers.authorization = `AWS4-HMAC-SHA256 Credential=${env.s3.accessKey}/${scope}, SignedHeaders=${signedHeaders.join(";")}, Signature=${signature}`;

    const res = await fetch(url, { method, headers, body: body as any });
    if (!res.ok && res.status !== 404) throw new Error(`S3 ${method} ${key} failed: ${res.status} ${await res.text()}`);
    return res;
  }

  async put(key: string, data: Buffer | string, contentType = "application/octet-stream") {
    await this.request("PUT", key, Buffer.from(data), contentType);
  }
  async putFile(key: string, filePath: string, contentType = "application/octet-stream") {
    await this.put(key, await fsp.readFile(filePath), contentType);
  }
  async get(key: string) {
    const res = await this.request("GET", key);
    return Buffer.from(await res.arrayBuffer());
  }
  async stream(key: string, range?: { start: number; end: number }) {
    const res = await this.request("GET", key, undefined, undefined, range ? { range: `bytes=${range.start}-${range.end}` } : {});
    return Readable.fromWeb(res.body as any);
  }
  async exists(key: string) {
    const res = await this.request("HEAD", key);
    return res.ok;
  }
  async size(key: string) {
    const res = await this.request("HEAD", key);
    return Number(res.headers.get("content-length") || 0);
  }
  async remove(key: string) {
    await this.request("DELETE", key);
  }
  localPath() {
    return null;
  }
  publicUrl(key: string) {
    return env.cdnBase ? `${env.cdnBase.replace(/\/$/, "")}/${key}` : null;
  }
}

let driver: StorageDriver | null = null;
export function storage(): StorageDriver {
  if (!driver) driver = env.storageDriver === "s3" ? new S3Driver() : new LocalDriver();
  return driver;
}

export const mediaKey = (assetId: string, ...rest: string[]) => ["media", assetId, ...rest].join("/");
export const uploadKey = (uploadId: string) => `uploads/${uploadId}.part`;

export const CONTENT_TYPES: Record<string, string> = {
  ".m3u8": "application/vnd.apple.mpegurl",
  ".ts": "video/mp2t",
  ".m4s": "video/iso.segment",
  ".mp4": "video/mp4",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".vtt": "text/vtt",
};

export const contentTypeFor = (key: string) => CONTENT_TYPES[path.extname(key).toLowerCase()] ?? "application/octet-stream";

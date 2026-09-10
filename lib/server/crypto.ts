import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { env } from "./env";

/* ------------------------------ passwords -------------------------------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");
  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, stored: string | null): boolean {
  if (!stored) return false;
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const a = Buffer.from(key, "hex");
  const b = scryptSync(password, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* -------------------------------- tokens ---------------------------------- */

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(input: string): string {
  return createHmac("sha256", env.secret).update(input).digest("hex");
}

function b64url(buf: Buffer | string): string {
  return Buffer.from(buf).toString("base64url");
}

/**
 * Compact signed payload: <base64url(json)>.<hmac>
 * Used for playback tokens, mock-gateway receipts and e-mail style links.
 */
export function sign(payload: Record<string, unknown>, ttlSeconds: number): string {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const data = b64url(JSON.stringify(body));
  const mac = createHmac("sha256", env.secret).update(data).digest("base64url");
  return `${data}.${mac}`;
}

export function verify<T = Record<string, unknown>>(token: string): T | null {
  const [data, mac] = (token || "").split(".");
  if (!data || !mac) return null;
  const expect = createHmac("sha256", env.secret).update(data).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (typeof parsed.exp === "number" && parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed as T;
  } catch {
    return null;
  }
}

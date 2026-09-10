import { NextResponse } from "next/server";

/** Uniform API envelope: { ok: true, data } | { ok: false, error: { code, message } } */

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (m = "Invalid request", d?: unknown) => new ApiError(400, "bad_request", m, d);
export const unauthorized = (m = "Sign in required") => new ApiError(401, "unauthorized", m);
export const forbidden = (m = "Not allowed") => new ApiError(403, "forbidden", m);
export const notFound = (m = "Not found") => new ApiError(404, "not_found", m);
export const conflict = (m = "Conflict") => new ApiError(409, "conflict", m);
export const paymentRequired = (m = "Unlock required", d?: unknown) => new ApiError(402, "payment_required", m, d);

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: e.code, message: e.message, details: e.details ?? undefined } },
      { status: e.status }
    );
  }
  console.error("[api] unhandled", e);
  const message = e instanceof Error ? e.message : "Server error";
  return NextResponse.json({ ok: false, error: { code: "server_error", message } }, { status: 500 });
}

/** Wraps a route handler so thrown ApiErrors become clean JSON. */
export function route<A extends any[]>(handler: (...args: A) => Promise<Response> | Response) {
  return async (...args: A): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      return fail(e);
    }
  };
}

/* ------------------------------- validation ------------------------------- */

export async function body<T = Record<string, any>>(req: Request): Promise<T> {
  try {
    const data = await req.json();
    if (!data || typeof data !== "object") throw badRequest("Body must be a JSON object");
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw badRequest("Body must be valid JSON");
  }
}

export function str(v: unknown, field: string, opts: { min?: number; max?: number; optional?: boolean; trim?: boolean } = {}): string {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw badRequest(`${field} is required`);
  }
  if (typeof v !== "string") throw badRequest(`${field} must be a string`);
  const s = opts.trim === false ? v : v.trim();
  if (opts.min !== undefined && s.length < opts.min) throw badRequest(`${field} must be at least ${opts.min} characters`);
  if (opts.max !== undefined && s.length > opts.max) throw badRequest(`${field} must be at most ${opts.max} characters`);
  return s;
}

export function num(v: unknown, field: string, opts: { min?: number; max?: number; optional?: boolean; def?: number } = {}): number {
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return opts.def ?? 0;
    throw badRequest(`${field} is required`);
  }
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw badRequest(`${field} must be a number`);
  if (opts.min !== undefined && n < opts.min) throw badRequest(`${field} must be >= ${opts.min}`);
  if (opts.max !== undefined && n > opts.max) throw badRequest(`${field} must be <= ${opts.max}`);
  return n;
}

export function bool(v: unknown, def = false): boolean {
  if (v === undefined || v === null || v === "") return def;
  if (typeof v === "boolean") return v;
  return v === "1" || v === 1 || v === "true";
}

export function oneOf<T extends string>(v: unknown, field: string, allowed: readonly T[], def?: T): T {
  if (v === undefined || v === null || v === "") {
    if (def !== undefined) return def;
    throw badRequest(`${field} is required`);
  }
  if (!allowed.includes(v as T)) throw badRequest(`${field} must be one of ${allowed.join(", ")}`);
  return v as T;
}

export function email(v: unknown, field = "email"): string {
  const s = str(v, field, { max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) throw badRequest("Enter a valid email address");
  return s;
}

/* --------------------------------- paging --------------------------------- */

export interface Page {
  page: number;
  perPage: number;
  offset: number;
}

export function paging(url: URL, defPerPage = 20, maxPerPage = 100): Page {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const perPage = Math.min(maxPerPage, Math.max(1, parseInt(url.searchParams.get("perPage") || String(defPerPage), 10) || defPerPage));
  return { page, perPage, offset: (page - 1) * perPage };
}

export function paged<T>(rows: T[], total: number, p: Page) {
  return { items: rows, total, page: p.page, perPage: p.perPage, pages: Math.max(1, Math.ceil(total / p.perPage)) };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip") || "127.0.0.1";
}

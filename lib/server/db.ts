import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { env } from "./env";
import { SCHEMA, SCHEMA_VERSION } from "./schema";

/**
 * The single seam between the platform and its database.
 *
 * Everything above this file speaks `all / get / run / tx` and plain SQL.
 * Swapping SQLite for PostgreSQL means reimplementing these four functions
 * (plus the `?` -> `$n` placeholder rewrite) and nothing else.
 */

type Param = string | number | boolean | null | undefined | bigint | Uint8Array | Date;

let handle: DatabaseSync | null = null;
const cache = new Map<string, StatementSync>();

function open(): DatabaseSync {
  fs.mkdirSync(env.dataDir, { recursive: true });
  fs.mkdirSync(env.mediaDir, { recursive: true });
  fs.mkdirSync(env.uploadDir, { recursive: true });
  const d = new DatabaseSync(env.dbFile);
  // WAL needs shared-memory mapping, which network/FUSE volumes refuse.
  // Try it, fall back to a rollback journal rather than dying at boot.
  try {
    d.exec("PRAGMA journal_mode = WAL");
  } catch {
    try {
      d.exec("PRAGMA journal_mode = TRUNCATE");
    } catch {
      /* stay on the default journal */
    }
  }
  for (const pragma of ["PRAGMA synchronous = NORMAL", "PRAGMA foreign_keys = ON", "PRAGMA busy_timeout = 8000", "PRAGMA temp_store = MEMORY"]) {
    try {
      d.exec(pragma);
    } catch {
      /* optional */
    }
  }
  return d;
}

export function db(): DatabaseSync {
  if (!handle) {
    handle = open();
    migrate(handle);
  }
  return handle;
}

export function migrate(d: DatabaseSync = db()) {
  d.exec(SCHEMA);
  d.prepare("INSERT INTO meta(key, value) VALUES('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(String(SCHEMA_VERSION));
}

/* --------------------------------- params --------------------------------- */

function norm(p: Param): string | number | bigint | null | Uint8Array {
  if (p === undefined || p === null) return null;
  if (typeof p === "boolean") return p ? 1 : 0;
  if (p instanceof Date) return p.getTime();
  return p;
}

function stmt(sql: string): StatementSync {
  let s = cache.get(sql);
  if (!s) {
    s = db().prepare(sql);
    cache.set(sql, s);
  }
  return s;
}

/* ---------------------------------- query --------------------------------- */

export function all<T = any>(sql: string, ...params: Param[]): T[] {
  return stmt(sql).all(...params.map(norm)) as T[];
}

export function get<T = any>(sql: string, ...params: Param[]): T | null {
  const row = stmt(sql).get(...params.map(norm));
  return (row ?? null) as T | null;
}

export function run(sql: string, ...params: Param[]) {
  return stmt(sql).run(...params.map(norm));
}

export function scalar<T = number>(sql: string, ...params: Param[]): T {
  const row = stmt(sql).get(...params.map(norm)) as Record<string, any> | undefined;
  if (!row) return 0 as unknown as T;
  return Object.values(row)[0] as T;
}

export function count(sql: string, ...params: Param[]): number {
  return Number(scalar<number>(sql, ...params) ?? 0);
}

/** Synchronous transaction. Rolls back and rethrows on any error. */
export function tx<T>(fn: () => T): T {
  const d = db();
  d.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    d.exec("COMMIT");
    return out;
  } catch (e) {
    try {
      d.exec("ROLLBACK");
    } catch {
      /* already rolled back */
    }
    throw e;
  }
}

/* --------------------------------- helpers -------------------------------- */

export const now = () => Date.now();

export function json<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** INSERT helper — keeps the long column lists in one place. */
export function insert(table: string, row: Record<string, Param>) {
  const keys = Object.keys(row);
  const sql = `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${keys.map(() => "?").join(", ")})`;
  return run(sql, ...keys.map((k) => row[k]));
}

/** UPDATE ... WHERE id = ? helper; ignores undefined fields. */
export function update(table: string, id: string, patch: Record<string, Param>) {
  const keys = Object.keys(patch).filter((k) => patch[k] !== undefined);
  if (!keys.length) return { changes: 0, lastInsertRowid: 0 };
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${k} = ?`).join(", ")} WHERE id = ?`;
  return run(sql, ...keys.map((k) => patch[k]), id);
}

export function dbFilePath() {
  return path.relative(process.cwd(), env.dbFile);
}

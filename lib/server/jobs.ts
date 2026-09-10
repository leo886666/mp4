import { all, get, insert, now, run } from "./db";
import { newId } from "./ids";

/**
 * Tiny durable job queue on top of the same SQLite file.
 *
 * Transcoding must survive a page navigation and a server restart, so jobs
 * live in a table rather than in memory. One in-process worker drains it;
 * pointing WORKER_CONCURRENCY at a separate process later changes nothing
 * above this file.
 */

export type JobKind = "transcode" | "sample-media" | "rollup" | "renewals";

export interface JobRow {
  id: string;
  kind: JobKind;
  payload: string;
  status: "queued" | "running" | "done" | "failed";
  attempts: number;
  error: string | null;
  progress: number;
  created_at: number;
  started_at: number | null;
  finished_at: number | null;
}

type Handler = (payload: any, ctx: { progress: (p: number) => void; jobId: string }) => Promise<void>;

const handlers = new Map<JobKind, Handler>();
let running = false;
let timer: NodeJS.Timeout | null = null;

export function registerJob(kind: JobKind, handler: Handler) {
  handlers.set(kind, handler);
}

export function enqueue(kind: JobKind, payload: Record<string, unknown> = {}): string {
  const id = newId("job");
  insert("jobs", {
    id,
    kind,
    payload: JSON.stringify(payload),
    status: "queued",
    attempts: 0,
    progress: 0,
    created_at: now(),
  });
  wake();
  return id;
}

export function jobStatus(id: string): JobRow | null {
  return get<JobRow>("SELECT * FROM jobs WHERE id = ?", id);
}

export function queueDepth() {
  return all<{ status: string; n: number }>("SELECT status, COUNT(*) AS n FROM jobs GROUP BY status");
}

export function recentJobs(limit = 20) {
  return all<JobRow>("SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?", limit);
}

/**
 * Claim the oldest queued job *this process knows how to run*.
 *
 * The server has more than one module instance — instrumentation.ts boots one
 * (which registers every handler) while route handlers live in another (which
 * may only have registered `transcode` on its way to enqueueing one). Filtering
 * by the local handler set stops an instance from claiming work it would only
 * fail; the booted worker picks those up on its next tick instead.
 */
function claim(): JobRow | null {
  const kinds = [...handlers.keys()];
  if (!kinds.length) return null;
  const marks = kinds.map(() => "?").join(", ");
  const job = get<JobRow>(
    `SELECT * FROM jobs WHERE status = 'queued' AND kind IN (${marks}) ORDER BY created_at ASC LIMIT 1`,
    ...kinds
  );
  if (!job) return null;
  const res = run("UPDATE jobs SET status='running', started_at=?, attempts=attempts+1 WHERE id=? AND status='queued'", now(), job.id);
  return res.changes ? { ...job, status: "running" } : null;
}

async function drain() {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const job = claim();
      if (!job) break;
      const handler = handlers.get(job.kind);
      if (!handler) {
        // shouldn't happen now that claim() filters, but never strand a job
        run("UPDATE jobs SET status='queued', started_at=NULL WHERE id=?", job.id);
        continue;
      }
      try {
        const payload = JSON.parse(job.payload || "{}");
        await handler(payload, {
          jobId: job.id,
          progress: (p) => run("UPDATE jobs SET progress=? WHERE id=?", Math.max(0, Math.min(100, Math.round(p))), job.id),
        });
        run("UPDATE jobs SET status='done', progress=100, finished_at=? WHERE id=?", now(), job.id);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const retry = job.attempts < 2;
        run(
          `UPDATE jobs SET status=?, error=?, finished_at=? WHERE id=?`,
          retry ? "queued" : "failed",
          msg.slice(0, 500),
          retry ? null : now(),
          job.id
        );
        console.error(`[jobs] ${job.kind} ${job.id} failed:`, msg);
        if (retry) await new Promise((r) => setTimeout(r, 1500));
      }
    }
  } finally {
    running = false;
  }
}

export function wake() {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    void drain();
  }, 50);
}

/** Started once from instrumentation.ts. */
export function startWorker(intervalMs = 5000) {
  wake();
  const loop = setInterval(() => void drain(), intervalMs);
  if (typeof loop.unref === "function") loop.unref();
  return loop;
}

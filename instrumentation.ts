/**
 * Next.js instrumentation hook — runs once per server process.
 * Node runtime only: the edge runtime has no filesystem or SQLite.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { boot, requeueStuckJobs } = await import("./lib/server/boot");
  await boot();
  const n = requeueStuckJobs();
  if (n) console.log(`[boot] re-queued ${n} interrupted job(s)`);
}

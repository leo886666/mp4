import path from "node:path";
import fsp from "node:fs/promises";
import { all, count, db, migrate, run } from "./db";
import { env } from "./env";
import { enqueue, registerJob, startWorker } from "./jobs";
import { clipFromImage, registerMediaJobs, transcode } from "./media";
import { getAsset, patchAsset } from "./repo/media";
import { mediaKey, storage } from "./storage";
import { dayKey, rollupDay } from "./repo/stats";
import { processRenewals } from "./services/orders";
import { isSeeded, seed } from "./seed";

/**
 * One-time server boot: migrate -> seed (first run only) -> register jobs ->
 * start the worker. Called from instrumentation.ts, so `npm run dev` and
 * `npm start` both produce a fully working platform with no extra commands.
 */

let booted = false;

export async function boot() {
  if (booted) return;
  booted = true;

  const t = Date.now();
  db();
  migrate();
  console.log(`[boot] database ready at ${path.relative(process.cwd(), env.dbFile)}`);

  registerMediaJobs();
  registerSampleMediaJob();
  registerMaintenanceJobs();

  if (env.seed && !isSeeded()) {
    console.log("[boot] empty database — seeding demo platform");
    seed({ media: env.seedMedia });
  }

  startWorker(4000);

  // keep today's rollup fresh; history is seeded and immutable
  const tick = setInterval(() => {
    try {
      rollupDay(dayKey(Date.now()));
    } catch (e) {
      console.error("[boot] rollup failed", e);
    }
  }, 5 * 60_000);
  if (typeof tick.unref === "function") tick.unref();

  const renew = setInterval(() => {
    try {
      const n = processRenewals(25);
      if (n) console.log(`[boot] renewed ${n} subscriptions`);
    } catch (e) {
      console.error("[boot] renewals failed", e);
    }
  }, 30 * 60_000);
  if (typeof renew.unref === "function") renew.unref();

  console.log(`[boot] ready in ${Date.now() - t}ms · ${count("SELECT COUNT(*) FROM series")} series · ${count("SELECT COUNT(*) FROM users")} users`);
}

/* ------------------------- placeholder media builder ---------------------- */

function registerSampleMediaJob() {
  registerJob("sample-media", async (payload: { assetId: string; image: string; seriesId?: string }, ctx) => {
    const asset = getAsset(payload.assetId);
    if (!asset) return;
    if (asset.status === "ready") return;

    const image = path.join(process.cwd(), "public", payload.image.replace(/^\//, ""));
    const srcKey = mediaKey(payload.assetId, "source.mp4");
    const localOut = storage().localPath(srcKey);
    const out = localOut ?? path.join(env.uploadDir, `${payload.assetId}-source.mp4`);
    await fsp.mkdir(path.dirname(out), { recursive: true });

    // A Ken-Burns pass over the series artwork: every episode plays real video
    // from the very first boot instead of showing an empty player.
    await clipFromImage(image, out, 20, "540x960");
    if (!localOut) await storage().putFile(srcKey, out);
    patchAsset(payload.assetId, { source_key: srcKey, original_name: path.basename(payload.image) });
    ctx.progress(25);

    await transcode(payload.assetId, (p) => ctx.progress(25 + p * 0.7));

    const ready = getAsset(payload.assetId);
    if (ready?.duration_s) {
      run("UPDATE episodes SET duration_s = ?, updated_at = ? WHERE media_id = ?", Math.round(ready.duration_s), Date.now(), payload.assetId);
    }
  });
}

function registerMaintenanceJobs() {
  registerJob("rollup", async (payload: { date?: string }) => {
    rollupDay(payload.date ?? dayKey(Date.now()));
  });
  registerJob("renewals", async () => {
    processRenewals(100);
  });
}

/** Re-queues anything that was mid-flight when the process died. */
export function requeueStuckJobs() {
  const stuck = all<{ id: string }>("SELECT id FROM jobs WHERE status = 'running'");
  for (const j of stuck) run("UPDATE jobs SET status='queued' WHERE id = ?", j.id);
  return stuck.length;
}

export { enqueue };

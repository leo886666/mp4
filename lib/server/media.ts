import { execFile } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "./env";
import { registerJob, enqueue } from "./jobs";
import { getAsset, patchAsset, type Variant } from "./repo/media";
import { mediaKey, storage } from "./storage";

const exec = promisify(execFile);

/**
 * Transcoding pipeline.
 *
 * upload -> media_assets(queued) -> job 'transcode' -> ffmpeg ladder ->
 * HLS (master + per-rendition playlists) + poster + sprite -> status 'ready'.
 *
 * Every rendition scales the SHORT side (vertical drama is portrait, so the
 * short side is the width) which keeps 9:16 and 16:9 sources on one ladder.
 */

const BANDWIDTH: Record<number, number> = { 360: 700_000, 540: 1_400_000, 720: 2_600_000, 1080: 4_800_000 };

export interface ProbeResult { duration: number; width: number; height: number; hasAudio: boolean }

export async function ffAvailable(): Promise<boolean> {
  try {
    await exec(env.ffmpeg, ["-version"]);
    return true;
  } catch {
    return false;
  }
}

export async function probe(file: string): Promise<ProbeResult> {
  const { stdout } = await exec(env.ffprobe, [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    file,
  ]);
  const data = JSON.parse(stdout);
  const v = (data.streams || []).find((s: any) => s.codec_type === "video");
  const a = (data.streams || []).find((s: any) => s.codec_type === "audio");
  return {
    duration: Math.round(parseFloat(data.format?.duration ?? v?.duration ?? "0") * 100) / 100,
    width: v?.width ?? 0,
    height: v?.height ?? 0,
    hasAudio: !!a,
  };
}

/** Ken-Burns sample clip from a still — used so no episode ever plays black. */
export async function clipFromImage(image: string, out: string, seconds = 8, size = "720x1280") {
  const fps = 25;
  await fsp.mkdir(path.dirname(out), { recursive: true });
  await exec(
    env.ffmpeg,
    [
      "-y", "-loglevel", "error",
      "-loop", "1", "-i", image,
      "-f", "lavfi", "-i", `anullsrc=channel_layout=stereo:sample_rate=44100`,
      "-t", String(seconds),
      "-vf",
      `scale=1080:-2,zoompan=z='min(zoom+0.0009,1.18)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${seconds * fps}:s=${size}:fps=${fps},format=yuv420p`,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "26",
      "-c:a", "aac", "-b:a", "64k", "-shortest",
      "-movflags", "+faststart",
      out,
    ],
    { maxBuffer: 1 << 24 }
  );
  return out;
}

async function workspace(assetId: string): Promise<{ dir: string; isLocal: boolean }> {
  const local = storage().localPath(mediaKey(assetId));
  if (local) {
    await fsp.mkdir(local, { recursive: true });
    return { dir: local, isLocal: true };
  }
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), `vesper-${assetId}-`));
  return { dir, isLocal: false };
}

async function uploadTree(assetId: string, dir: string) {
  const walk = async (rel: string): Promise<string[]> => {
    const entries = await fsp.readdir(path.join(dir, rel), { withFileTypes: true });
    const out: string[] = [];
    for (const e of entries) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) out.push(...(await walk(r)));
      else out.push(r);
    }
    return out;
  };
  const files = await walk(".");
  for (const f of files) {
    await storage().putFile(mediaKey(assetId, f.split(path.sep).join("/")), path.join(dir, f));
  }
}

export async function transcode(assetId: string, onProgress: (p: number) => void = () => {}) {
  const asset = getAsset(assetId);
  if (!asset) throw new Error(`media asset ${assetId} not found`);
  if (!asset.source_key) throw new Error(`media asset ${assetId} has no source`);

  patchAsset(assetId, { status: "processing", error: null });

  const { dir, isLocal } = await workspace(assetId);
  const sourceLocal = storage().localPath(asset.source_key);
  let src = sourceLocal ?? path.join(dir, "source.bin");
  if (!sourceLocal) await fsp.writeFile(src, await storage().get(asset.source_key));

  const ok = await ffAvailable();
  if (!ok) {
    // Graceful degradation: serve the original file progressively.
    patchAsset(assetId, { status: "ready", mp4_key: asset.source_key, error: "ffmpeg unavailable — progressive fallback" });
    return;
  }

  const info = await probe(src);
  onProgress(10);

  const short = Math.min(info.width, info.height) || 720;
  const ladder = env.ladder.filter((h) => h <= short * 1.05);
  if (!ladder.length) ladder.push(Math.min(short, 360));

  const variants: Variant[] = [];
  const hlsDir = path.join(dir, "hls");
  await fsp.mkdir(hlsDir, { recursive: true });

  for (let i = 0; i < ladder.length; i++) {
    const s = ladder[i];
    const vdir = path.join(hlsDir, `v${s}`);
    await fsp.mkdir(vdir, { recursive: true });
    const scale = `scale='if(gt(iw,ih),-2,${s})':'if(gt(iw,ih),${s},-2)'`;
    const args = [
      "-y", "-loglevel", "error",
      "-i", src,
      "-vf", scale,
      "-c:v", "libx264", "-preset", "veryfast", "-crf", String(24 + (ladder.length - 1 - i)),
      "-profile:v", "main", "-pix_fmt", "yuv420p",
      "-g", "50", "-keyint_min", "50", "-sc_threshold", "0",
    ];
    if (info.hasAudio) args.push("-c:a", "aac", "-b:a", "96k", "-ac", "2");
    else args.push("-an");
    args.push(
      "-f", "hls",
      "-hls_time", "4",
      "-hls_playlist_type", "vod",
      "-hls_flags", "independent_segments",
      "-hls_segment_filename", path.join(vdir, "seg_%04d.ts"),
      path.join(vdir, "index.m3u8")
    );
    await exec(env.ffmpeg, args, { maxBuffer: 1 << 26 });
    const portrait = info.height >= info.width;
    const w = portrait ? s : Math.round((info.width / info.height) * s / 2) * 2;
    const h = portrait ? Math.round((info.height / info.width) * s / 2) * 2 : s;
    variants.push({ height: s, bandwidth: BANDWIDTH[s] ?? s * 2000, key: `hls/v${s}/index.m3u8` });
    (variants[variants.length - 1] as any).resolution = `${w}x${h}`;
    onProgress(10 + ((i + 1) / ladder.length) * 70);
  }

  const master = [
    "#EXTM3U",
    "#EXT-X-VERSION:3",
    ...variants.flatMap((v) => [
      `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${(v as any).resolution},CODECS="avc1.4d401f,mp4a.40.2"`,
      `v${v.height}/index.m3u8`,
    ]),
  ].join("\n");
  await fsp.writeFile(path.join(hlsDir, "master.m3u8"), master + "\n");

  // poster + scrubbing sprite
  const posterPath = path.join(dir, "poster.jpg");
  await exec(env.ffmpeg, ["-y", "-loglevel", "error", "-ss", String(Math.min(1, info.duration / 4)), "-i", src, "-frames:v", "1", "-vf", "scale=540:-2", posterPath]);
  const spritePath = path.join(dir, "sprite.jpg");
  const every = Math.max(1, Math.round(info.duration / 10));
  try {
    await exec(env.ffmpeg, ["-y", "-loglevel", "error", "-i", src, "-vf", `fps=1/${every},scale=160:-2,tile=10x1`, "-frames:v", "1", spritePath]);
  } catch {
    /* sprite is a nicety, never fail the job for it */
  }
  onProgress(90);

  if (!isLocal) await uploadTree(assetId, dir);

  patchAsset(assetId, {
    status: "ready",
    duration_s: info.duration,
    width: info.width,
    height: info.height,
    hls_key: mediaKey(assetId, "hls/master.m3u8"),
    poster_key: mediaKey(assetId, "poster.jpg"),
    sprite_key: fs.existsSync(spritePath) ? mediaKey(assetId, "sprite.jpg") : null,
    variants: JSON.stringify(variants),
    bytes: (await fsp.stat(src).catch(() => ({ size: 0 } as any))).size,
  });
  onProgress(100);
}

let registered = false;
export function registerMediaJobs() {
  if (registered) return;
  registered = true;
  registerJob("transcode", async (payload: { assetId: string }, ctx) => {
    try {
      await transcode(payload.assetId, ctx.progress);
    } catch (e) {
      patchAsset(payload.assetId, { status: "failed", error: e instanceof Error ? e.message : String(e) });
      throw e;
    }
  });
}

export function queueTranscode(assetId: string) {
  registerMediaJobs();
  return enqueue("transcode", { assetId });
}

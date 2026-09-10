#!/usr/bin/env node
/**
 * End-to-end smoke test for the whole platform.
 *
 *   npm run dev        # in one terminal
 *   npm run smoke      # in another
 *
 * Walks the real HTTP surface: sign up -> browse -> hit the paywall -> pay ->
 * watch (HLS bytes) -> favourite/comment -> creator upload -> review queue ->
 * admin approve -> refund. Any red line is a broken contract.
 */
const BASE = process.env.VESPER_URL || "http://127.0.0.1:3300";

let pass = 0, fail = 0;
const jars = new Map();

function jar(name) {
  if (!jars.has(name)) jars.set(name, new Map());
  return jars.get(name);
}

async function call(who, method, path, bodyOrOpts, opts = {}) {
  const cookies = jar(who);
  const headers = { ...(opts.headers || {}) };
  if (cookies.size) headers.cookie = [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  let body;
  if (bodyOrOpts !== undefined && bodyOrOpts !== null) {
    if (bodyOrOpts instanceof Uint8Array) body = bodyOrOpts;
    else {
      body = JSON.stringify(bodyOrOpts);
      headers["content-type"] = "application/json";
    }
  }
  const res = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
  for (const [k, v] of res.headers) {
    if (k.toLowerCase() === "set-cookie") {
      for (const part of v.split(/,(?=[^;]+=)/)) {
        const [pair] = part.split(";");
        const idx = pair.indexOf("=");
        cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim());
      }
    }
  }
  const type = res.headers.get("content-type") || "";
  const payload = type.includes("json") ? await res.json() : await res.arrayBuffer();
  return { status: res.status, headers: res.headers, body: payload };
}

const get = (who, p) => call(who, "GET", p);
const post = (who, p, b) => call(who, "POST", p, b ?? {});
const patch = (who, p, b) => call(who, "PATCH", p, b ?? {});

function check(label, cond, extra = "") {
  if (cond) { pass++; console.log(`  \x1b[32m✓\x1b[0m ${label}`); }
  else { fail++; console.log(`  \x1b[31m✗ ${label}\x1b[0m ${extra}`); }
  return cond;
}
const section = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const data = (r) => r.body?.data ?? {};

async function main() {
  console.log(`VESPER smoke test → ${BASE}`);

  section("Health");
  const health = await get("anon", "/api/health");
  check("GET /api/health", health.status === 200 && data(health).status === "up");
  const counts = data(health).counts || {};
  check(`catalog seeded (${counts.series} series, ${counts.episodes} episodes)`, counts.series > 0 && counts.episodes > 0);
  check(`audience seeded (${counts.users} users, ${counts.orders} orders)`, counts.users > 100);

  section("Catalog (anonymous)");
  const home = await get("anon", "/api/home");
  check("GET /api/home", home.status === 200 && data(home).rails.length > 0);
  check("hero carousel has artwork", data(home).hero.every((h) => h.image && h.series?.cover));
  const list = await get("anon", "/api/series?sort=trending&perPage=5");
  check("GET /api/series", list.status === 200 && data(list).items.length === 5);
  check("no empty covers", data(list).items.every((s) => !!s.cover));
  const seriesId = data(list).items[0].id;
  const detail = await get("anon", `/api/series/${seriesId}`);
  check(`GET /api/series/${seriesId}`, detail.status === 200 && data(detail).episodes.length > 0);
  const episodes = data(detail).episodes;
  const freeEp = episodes.find((e) => !e.locked);
  const lockedEp = episodes.find((e) => e.locked);
  check("free + locked episodes present", !!freeEp && !!lockedEp);
  check("GET /api/search", (await get("anon", "/api/search?q=love")).status === 200);
  check("GET /api/genres", (await get("anon", "/api/genres")).status === 200);

  section("Playback gate");
  const play = await get("anon", `/api/episodes/${freeEp.id}/play`);
  check("free episode plays without an account", play.status === 200 && !!data(play).token);
  const sources = data(play).sources || [];
  if (check("HLS source present", sources.some((s) => s.type === "hls"), JSON.stringify(data(play).media))) {
    const manifest = await get("anon", sources.find((s) => s.type === "hls").url);
    const text = Buffer.from(manifest.body).toString("utf8");
    check("master.m3u8 served", manifest.status === 200 && text.includes("#EXTM3U"));
    const variant = text.split("\n").find((l) => l.startsWith("/api/stream/"));
    const vres = await get("anon", variant);
    const vtext = Buffer.from(vres.body).toString("utf8");
    check("variant playlist served", vres.status === 200 && vtext.includes("#EXTINF"));
    const seg = vtext.split("\n").find((l) => l.startsWith("/api/stream/"));
    const sres = await get("anon", seg);
    check(`segment bytes served (${sres.body.byteLength ?? 0} B)`, sres.status === 200 && sres.body.byteLength > 1000);
    const noToken = await get("anon", seg.split("?")[0]);
    check("segment without token is refused", noToken.status === 403);
  }
  const lockedAnon = await get("anon", `/api/episodes/${lockedEp.id}/play`);
  check("locked episode returns 402", lockedAnon.status === 402, `got ${lockedAnon.status}`);

  section("Accounts");
  const email = `smoke${Date.now()}@example.com`;
  const reg = await post("viewer", "/api/auth/register", { email, name: "Smoke Viewer", password: "vesper2026" });
  check("POST /api/auth/register", reg.status === 200 && data(reg).user.id);
  const me = await get("viewer", "/api/auth/me");
  check("GET /api/auth/me (session cookie)", me.status === 200 && data(me).user?.email === email);
  check("new account is not VIP", data(me).user.vip === false);
  const lockedUser = await get("viewer", `/api/episodes/${lockedEp.id}/play`);
  check("locked episode still 402 for free account", lockedUser.status === 402);
  check("402 says how to unlock", lockedUser.body?.error?.details?.requires === "vip" || lockedUser.body?.error?.details?.requires === "purchase");

  section("Email as a provider");
  const passwordless = `nopass${Date.now()}@example.com`;
  const emailNew = await post("passwordless", "/api/auth/email", { email: passwordless });
  check("unknown address signs in with no password", emailNew.status === 200 && data(emailNew).user?.email === passwordless);
  check("account was created on the fly", data(emailNew).created === true);
  check("session works after email sign-in", data(await get("passwordless", "/api/auth/me")).user?.email === passwordless);
  const staffProbe = await post("probe", "/api/auth/email", { email: "admin@vesper.app" });
  check("staff address cannot be claimed by typing it", staffProbe.status === 200 && data(staffProbe).requiresPassword === true);
  check("...and no session was handed out", data(await get("probe", "/api/auth/me")).user === null);
  const staffWrong = await post("probe", "/api/auth/email", { email: "admin@vesper.app", password: "wrong-password" });
  check("wrong password is rejected", staffWrong.status === 401);
  const staffRight = await post("probe2", "/api/auth/email", { email: "admin@vesper.app", password: "vesper2026" });
  check("correct password signs the staff account in", staffRight.status === 200 && data(staffRight).user?.role === "admin");

  section("Checkout → VIP");
  const plans = await get("anon", "/api/plans");
  check("GET /api/plans", plans.status === 200 && data(plans).plans.length >= 4);
  const monthly = data(plans).plans.find((p) => p.id === "monthly");
  const coupon = await post("viewer", "/api/coupons/validate", { code: "WELCOME50", planId: monthly.id });
  check("coupon WELCOME50 validates", coupon.status === 200 && data(coupon).valid);
  const order = await post("viewer", "/api/orders", { kind: "subscription", planId: monthly.id, couponCode: "WELCOME50" });
  check("POST /api/orders", order.status === 200 && data(order).order.id);
  check("50% discount applied", data(order).order.amount === Math.round(monthly.price * 50) / 100, `amount=${data(order).order.amount}`);
  const orderId = data(order).order.id;
  const orderDetail = await get("viewer", `/api/orders/${orderId}`);
  const confirmToken = data(orderDetail).confirmToken;
  check("hosted checkout issues a signed token", !!confirmToken);
  const paid = await post("viewer", "/api/payments/mock/confirm", { token: confirmToken, outcome: "succeeded", method: "card" });
  check("payment confirmed", paid.status === 200 && data(paid).status === "paid");
  const meVip = await get("viewer", "/api/auth/me");
  check("account is VIP after payment", data(meVip).user.vip === true);
  const sub = await get("viewer", "/api/me/subscription");
  check("subscription is active", data(sub).subscription?.status === "active");
  const unlocked = await get("viewer", `/api/episodes/${lockedEp.id}/play`);
  check("previously locked episode now plays", unlocked.status === 200 && data(unlocked).access.reason === "vip");
  const cancel = await post("viewer", "/api/me/subscription", { action: "cancel" });
  check("auto-renew can be cancelled", cancel.status === 200 && data(cancel).autoRenew === false);

  section("Engagement");
  check("progress saved", (await post("viewer", "/api/progress", { episodeId: freeEp.id, positionS: 42, durationS: 120 })).status === 200);
  const history = await get("viewer", "/api/me/history");
  check("history reflects progress", history.status === 200 && data(history).items.some((h) => h.episodeId === freeEp.id));
  check("history rows carry artwork", data(history).items.every((h) => !!h.cover));
  const fav = await post("viewer", `/api/series/${seriesId}/favorite`);
  check("favorite toggled on", fav.status === 200 && data(fav).favorite === true);
  check("favorites list", data(await get("viewer", "/api/me/favorites")).items.length === 1);
  const comment = await post("viewer", `/api/series/${seriesId}/comments`, { body: "Binged the whole thing in one night." });
  check("comment posted", comment.status === 200 && data(comment).comment.id);
  check("danmaku posted", (await post("viewer", `/api/episodes/${freeEp.id}/danmaku`, { tMs: 3200, body: "here we go" })).status === 200);
  check("report filed", (await post("viewer", "/api/reports", { targetType: "series", targetId: seriesId, reason: "Spoiler in thumbnail" })).status === 200);
  check("events ingested", data(await post("viewer", "/api/events", { events: [{ name: "play_start", seriesId }, { name: "share", seriesId }] })).stored === 2);

  section("Creator Studio");
  const studioLogin = await post("creator", "/api/auth/login", { email: "creator@vesper.app", password: "vesper2026" });
  check("creator signs in", studioLogin.status === 200);
  const overview = await get("creator", "/api/studio/overview");
  check("GET /api/studio/overview", overview.status === 200 && !!data(overview).creator.id);
  const created = await post("creator", "/api/studio/series", { title: `Smoke Test Drama ${Date.now()}`, genre: "thriller", synopsis: "A QA engineer discovers the tests were watching back.", tags: ["Meta", "Suspense"] });
  check("POST /api/studio/series", created.status === 200 && data(created).series.id);
  check("new series gets a placeholder cover", !!data(created).series.cover);
  const newSeriesId = data(created).series.id;

  // a real (tiny) mp4 so the transcoder is exercised for real, not just the API
  let payload = Buffer.from("fake mp4 bytes for the smoke test".repeat(40));
  try {
    const { execFileSync } = await import("node:child_process");
    const os = await import("node:os");
    const fs = await import("node:fs");
    const path = await import("node:path");
    const tmp = path.join(os.tmpdir(), `vesper-smoke-${Date.now()}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "lavfi", "-i", "testsrc=size=270x480:rate=15:duration=2",
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100", "-t", "2",
      "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", "-movflags", "+faststart", tmp]);
    payload = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
  } catch {
    console.log("  (ffmpeg unavailable — uploading a stub file instead)");
  }
  const init = await post("creator", "/api/uploads", { filename: "ep1.mp4", size: payload.length, mime: "video/mp4", kind: "video" });
  check("POST /api/uploads (init)", init.status === 200 && data(init).uploadId);
  const put = await call("creator", "PUT", `/api/uploads/${data(init).uploadId}?part=0`, payload);
  check("PUT part", put.status === 200 && data(put).percent === 100);
  const complete = await post("creator", `/api/uploads/${data(init).uploadId}/complete`, {});
  check("POST complete → media asset queued", complete.status === 200 && data(complete).mediaId);
  const ep = await post("creator", `/api/studio/series/${newSeriesId}/episodes`, { title: "Pilot", mediaId: data(complete).mediaId });
  check("episode created with media", ep.status === 200 && data(ep).episode.hasMedia);
  // wait for the transcoder to finish this asset
  let mediaStatus = "queued";
  for (let i = 0; i < 40 && mediaStatus !== "ready" && mediaStatus !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 500));
    mediaStatus = data(await get("creator", `/api/media/${data(complete).mediaId}`)).status;
  }
  check(`uploaded video transcoded to HLS (status=${mediaStatus})`, mediaStatus === "ready");

  const submit = await post("creator", `/api/studio/series/${newSeriesId}/submit`, {});
  check("submitted for review", submit.status === 200 && data(submit).status === "review");
  check("GET /api/studio/earnings", (await get("creator", "/api/studio/earnings")).status === 200);

  section("Ops console (RBAC)");
  const badLogin = await post("nobody", "/api/auth/admin", { email: "demo@vesper.app", password: "vesper2026" });
  check("viewer account cannot open the console", badLogin.status === 403, `got ${badLogin.status}`);
  const noAuth = await get("nobody", "/api/admin/overview");
  check("console API refuses anonymous", noAuth.status === 401);
  const adminLogin = await post("admin", "/api/auth/admin", { email: "admin@vesper.app", password: "vesper2026" });
  check("admin signs in", adminLogin.status === 200 && data(adminLogin).permissions.includes("orders.refund"));
  const ov = await get("admin", "/api/admin/overview");
  check("GET /api/admin/overview", ov.status === 200 && data(ov).kpis.dau >= 0 && data(ov).daily.length > 30);
  check("funnel is populated", data(ov).funnel[0].value > 0);
  check("cohorts computed from real signups", data(ov).cohorts.length === 8);
  const users = await get("admin", "/api/admin/users?perPage=5");
  check("GET /api/admin/users", users.status === 200 && data(users).items.length === 5);
  const orders = await get("admin", "/api/admin/orders?perPage=5");
  check("GET /api/admin/orders", orders.status === 200 && data(orders).summary.paid > 0);
  const reviews = await get("admin", "/api/admin/reviews?status=pending");
  const mine = data(reviews).items.find((r) => r.target_id === newSeriesId);
  check("submission reached the review queue", !!mine);
  const decide = await post("admin", `/api/admin/reviews/${mine.id}`, { decision: "approved", note: "Looks good." });
  check("review approved", decide.status === 200);
  const nowPublic = await get("anon", `/api/series/${newSeriesId}`);
  check("approved series is publicly visible", nowPublic.status === 200 && data(nowPublic).series.publishState === "published");

  const refund = await post("admin", `/api/admin/orders/${orderId}/refund`, { reason: "Smoke test" });
  check("refund issued", refund.status === 200 && data(refund).order.status === "refunded");
  const afterRefund = await get("viewer", "/api/auth/me");
  check("VIP revoked after refund", data(afterRefund).user.vip === false);

  check("GET /api/admin/reports", (await get("admin", "/api/admin/reports")).status === 200);
  check("GET /api/admin/campaigns", (await get("admin", "/api/admin/campaigns")).status === 200);
  check("GET /api/admin/payouts", (await get("admin", "/api/admin/payouts")).status === 200);
  check("GET /api/admin/audit", (await get("admin", "/api/admin/audit")).status === 200);
  check("GET /api/admin/settings", (await get("admin", "/api/admin/settings")).status === 200);
  const settingsWrite = await patch("admin", "/api/admin/settings", { "site.tagline": "Stories that fit your night." });
  check("admin cannot write owner-only settings", settingsWrite.status === 403, `got ${settingsWrite.status}`);
  const ownerLogin = await post("owner", "/api/auth/admin", { email: "owner@vesper.app", password: "vesper2026" });
  check("owner signs in", ownerLogin.status === 200);
  check("owner can write settings", (await patch("owner", "/api/admin/settings", { "site.tagline": "Stories that fit your night." })).status === 200);

  section("Result");
  console.log(`\n  ${pass} passed, ${fail} failed\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\n\x1b[31mSmoke run crashed:\x1b[0m", e);
  process.exit(1);
});

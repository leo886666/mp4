import { all, count, get, insert, now, run, tx } from "./db";
import { newId, hash32 } from "./ids";
import { hashPassword } from "./crypto";
import { DRAMAS, GENRES, CREATORS, PLANS } from "@/lib/data";
import { episodeTitle } from "@/lib/utils";
import { createSeries, createEpisode, recountEpisodes } from "./repo/catalog";
import { createCreator, upsertBanner, upsertRail, setSetting, submitForReview } from "./repo/ops";
import { createUser } from "./repo/users";
import { createAsset } from "./repo/media";
import { createOrder, createPayout, grantEntitlement, ledgerEntry, upsertSubscription } from "./repo/commerce";
import { enqueue } from "./jobs";
import { rollupDay } from "./repo/stats";
import { env } from "./env";

/**
 * Seeds a brand-new database into a believable, *queryable* platform:
 * real rows in real tables, not fixtures in a JSON file. Everything here is
 * deterministic (seeded PRNG) so two installs produce identical data.
 */

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400_000;
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length) % arr.length];

const COUNTRIES: [string, number][] = [
  ["United States", 34], ["Brazil", 15], ["Indonesia", 11], ["Mexico", 9],
  ["Philippines", 8], ["United Kingdom", 6], ["Germany", 5], ["India", 7], ["Other", 5],
];
const CHANNELS = ["organic", "tiktok", "meta", "google", "asa", "telegram"];

function weighted(r: () => number, table: [string, number][]) {
  const total = table.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [k, w] of table) {
    x -= w;
    if (x <= 0) return k;
  }
  return table[0][0];
}

const FIRST = ["Ava","Liam","Mia","Noah","Zoe","Ethan","Luna","Kai","Nora","Leo","Ivy","Milo","Sofia","Jae","Aria","Diego","Yuki","Amara","Ravi","Elena","Tomas","Nina","Oscar","Priya","Hana","Marco","Layla","Felix","Rosa","Dmitri"];
const LAST = ["Chen","Silva","Novak","Okafor","Kim","Haddad","Rossi","Nguyen","Alvarez","Park","Dubois","Ivanov","Santos","Kowalski","Mbeki","Tanaka","Moreau","Costa","Reyes","Fischer"];

/* -------------------------------------------------------------------------- */

export function isSeeded(): boolean {
  return count("SELECT COUNT(*) FROM series") > 0;
}

export function seed(opts: { media?: boolean } = {}) {
  const r = rng(20260910);
  const t0 = now();
  const today = new Date(t0);
  const startOfToday = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());

  console.log("[seed] building catalog…");

  tx(() => {
    /* ------------------------------- genres ------------------------------- */
    GENRES.forEach((g, i) => insert("genres", { id: g.id, name: g.name, sort: i }));

    /* -------------------------------- plans ------------------------------- */
    const planDays: Record<string, number> = { weekly: 7, monthly: 30, quarterly: 90, annual: 365 };
    PLANS.forEach((p, i) =>
      insert("plans", {
        id: p.id,
        name: p.name,
        price_cents: Math.round(p.price * 100),
        period: p.period,
        days: planDays[p.id] ?? 30,
        per_month_cents: p.perMonth ? Math.round(p.perMonth * 100) : null,
        badge: p.badge ?? null,
        savings: p.savings ?? null,
        highlight: p.highlight ? 1 : 0,
        active: 1,
        sort: i,
      })
    );

    /* ------------------------------- coupons ------------------------------ */
    insert("coupons", { code: "WELCOME50", kind: "percent", value: 50, plan_ids: "[]", max_uses: 5000, used: 412, starts_at: null, ends_at: null, active: 1, created_at: t0 });
    insert("coupons", { code: "VESPER10", kind: "amount", value: 300, plan_ids: JSON.stringify(["monthly", "quarterly", "annual"]), max_uses: 0, used: 89, starts_at: null, ends_at: null, active: 1, created_at: t0 });
    insert("coupons", { code: "CREATORFAM", kind: "percent", value: 30, plan_ids: "[]", max_uses: 500, used: 27, starts_at: null, ends_at: null, active: 1, created_at: t0 });

    /* ------------------------------ campaigns ----------------------------- */
    const campaignSpec: [string, string, number, number][] = [
      ["TikTok Ads", "Revenge Hooks · Spark", 4820000, 26400],
      ["TikTok Ads", "Billionaire UGC · A/B", 3180000, 15100],
      ["Meta Ads", "Werewolf Lookalike 1%", 2740000, 12800],
      ["Google UAC", "Brand + Genre terms", 1960000, 11400],
      ["Apple Search Ads", "Brand defense", 820000, 6900],
      ["Telegram", "Creator referrals", 420000, 5800],
      ["Organic", "ASO + social", 0, 18300],
    ];
    const campaignIds = campaignSpec.map(([channel, name, spend, installs], i) => {
      const id = `cmp_${i + 1}`;
      insert("campaigns", {
        id, channel, name, spend_cents: spend, installs, status: i === 5 ? "paused" : "running",
        utm: name.toLowerCase().replace(/[^a-z0-9]+/g, "_"), started_at: t0 - 80 * DAY, ended_at: null, created_at: t0 - 80 * DAY,
      });
      return id;
    });

    /* ------------------------------- creators ----------------------------- */
    CREATORS.forEach((c) =>
      createCreator({
        id: c.id,
        name: c.name,
        role: c.role,
        followers: Math.round(parseFloat(c.followers) * (c.followers.includes("M") ? 1_000_000 : 1000)),
        shareBps: c.role === "Premium Studio" ? 7000 : 6500,
      })
    );

    /* --------------------------------- staff ------------------------------ */
    const pw = hashPassword("vesper2026");
    createUser({ id: "usr_owner", email: "owner@vesper.app", name: "Vesper Owner", passwordHash: pw, role: "owner", createdAt: t0 - 120 * DAY });
    createUser({ id: "usr_admin", email: "admin@vesper.app", name: "Ops Admin", passwordHash: pw, role: "admin", createdAt: t0 - 110 * DAY });
    createUser({ id: "usr_review", email: "reviewer@vesper.app", name: "Content Reviewer", passwordHash: pw, role: "reviewer", createdAt: t0 - 100 * DAY });
    const creatorUser = createUser({ id: "usr_creator", email: "creator@vesper.app", name: "Emberlight Studio", passwordHash: pw, role: "creator", createdAt: t0 - 95 * DAY });
    run("UPDATE creators SET user_id = ? WHERE id = 'emberlight'", creatorUser.id);
    createUser({ id: "usr_demo", email: "demo@vesper.app", name: "Demo Viewer", passwordHash: pw, role: "user", vipUntil: t0 + 21 * DAY, createdAt: t0 - 45 * DAY });

    /* -------------------------------- series ------------------------------ */
    for (const d of DRAMAS) {
      const publishedAt = t0 - Math.floor(r() * 80 + 5) * DAY;
      const monetization = hash32(d.id) % 7 === 0 ? "ppe" : "vip";
      createSeries({
        id: d.id,
        title: d.title,
        genreId: d.genre,
        creatorId: d.creator,
        synopsis: d.synopsis,
        tags: d.tags,
        coverUrl: d.cover,
        heroUrl: d.hero ? `${d.hero}.jpg` : null,
        freeEpisodes: d.freeEpisodes,
        monetization: monetization as "vip" | "ppe",
        ppePriceCents: 99,
        status: "published",
        rating: d.rating,
        views: d.views,
        ongoing: d.status === "Ongoing",
        updatedLabel: d.updatedLabel,
        isNew: d.isNew,
        featured: ["her-silent-revenge", "the-last-heir", "cursed-by-the-moon", "midnight-vows", "neighbor-in-4b"].includes(d.id),
        publishedAt,
        createdAt: publishedAt,
      });

      const total = Math.min(d.episodes, 30);
      for (let n = 1; n <= total; n++) {
        createEpisode({
          seriesId: d.id,
          n,
          title: episodeTitle(n),
          durationS: 0, // filled from the real media asset once transcoded
          access: n <= d.freeEpisodes ? "free" : monetization === "ppe" ? "ppe" : "vip",
          priceCents: n <= d.freeEpisodes ? 0 : 99,
          posterUrl: d.cover,
          status: "published",
          createdAt: publishedAt + n * 3600_000,
        });
      }
      recountEpisodes(d.id);
    }

    /* ------------------------ two drafts awaiting review ------------------- */
    const draft1 = createSeries({
      title: "The Winter Contract", genreId: "billionaire", creatorId: "nova-reels",
      synopsis: "She signs a ninety-day marriage to save her father's shipyard. He signs it to inherit an empire. Neither reads the clause on page nine.",
      tags: ["Contract Love", "Slow Burn"], status: "review", freeEpisodes: 3, createdAt: t0 - 2 * DAY,
    });
    const draft2 = createSeries({
      title: "Paper Moon Hotel", genreId: "retro", creatorId: "quill",
      synopsis: "A 1971 night auditor keeps a ledger of everyone who checks in and never out.",
      tags: ["Period", "Mystery"], status: "review", freeEpisodes: 4, createdAt: t0 - 5 * DAY,
    });
    for (const s of [draft1, draft2]) {
      for (let n = 1; n <= 6; n++) {
        createEpisode({ seriesId: s.id, n, title: episodeTitle(n), access: n <= s.free_episodes ? "free" : "vip", priceCents: 99, posterUrl: s.cover_url, status: "review", createdAt: s.created_at + n * 3600_000 });
      }
      submitForReview({
        targetType: "series", targetId: s.id, seriesId: s.id, title: `${s.title} — new series`,
        kind: "New series", submittedBy: "usr_creator", submitterName: s.creator_id === "quill" ? "Quill & Co." : "Nova Reels",
        note: "6 episodes uploaded, cover attached.",
      });
    }
    submitForReview({
      targetType: "episode", targetId: "midnight-vows-ep-69", seriesId: "midnight-vows",
      title: "Midnight Vows — EP 69", kind: "New episode", submittedBy: "usr_creator", submitterName: "Emberlight Studio",
    });

    /* -------------------------------- users ------------------------------- */
    console.log("[seed] generating audience…");
    const userIds: { id: string; createdAt: number; country: string }[] = [];
    const USERS = 12000;
    for (let i = 0; i < USERS; i++) {
      // recent-weighted signup curve over 90 days
      const age = Math.floor(Math.pow(r(), 1.35) * 90);
      const createdAt = startOfToday - age * DAY + Math.floor(r() * DAY);
      const name = `${pick(r, FIRST)} ${pick(r, LAST)}`;
      const country = weighted(r, COUNTRIES);
      const channel = pick(r, CHANNELS);
      const id = `usr_s${i.toString(36)}`;
      createUser({
        id,
        email: `${name.toLowerCase().replace(/\s+/g, ".")}${i}@example.com`,
        name,
        role: "user",
        country,
        channel,
        campaignId: channel === "organic" ? campaignIds[6] : pick(r, campaignIds.slice(0, 6)),
        createdAt,
      });
      run("UPDATE users SET last_seen_at = ? WHERE id = ?", Math.min(t0, createdAt + Math.floor(r() * 30) * DAY), id);
      userIds.push({ id, createdAt, country });
    }

    /* -------------------------------- orders ------------------------------ */
    console.log("[seed] generating orders…");
    const planRows = all<{ id: string; price_cents: number; days: number; name: string }>("SELECT id, price_cents, days, name FROM plans");
    const planWeights: [string, number][] = [["monthly", 44], ["annual", 21], ["quarterly", 19], ["weekly", 16]];
    const seriesIds = DRAMAS.map((d) => d.id);
    const methods: [string, number][] = [["apple", 55], ["google", 27], ["card", 18]];

    let orderSeq = 0;
    for (const u of userIds) {
      // ~9% of users convert
      if (r() > 0.09) continue;
      const delay = Math.floor(Math.pow(r(), 2) * 12) * DAY + Math.floor(r() * DAY);
      const paidAt = u.createdAt + delay;
      if (paidAt > t0) continue;
      const ppe = r() < 0.18;
      const method = weighted(r, methods);
      if (ppe) {
        const sid = pick(r, seriesIds);
        const o = createOrder({
          id: `ord_s${(orderSeq++).toString(36)}`,
          userId: u.id, kind: "episode", refId: `${sid}#ep`, title: `Unlock episode`,
          amountCents: 99, gateway: method === "card" ? "stripe" : method, country: u.country, createdAt: paidAt, status: "paid",
        });
        insert("payments", { id: newId("pmt"), order_id: o.id, gateway: o.gateway, gateway_ref: `seed_${o.id}`, amount_cents: 99, status: r() < 0.03 ? "failed" : "succeeded", method, raw: "{}", created_at: paidAt });
        const creator = DRAMAS.find((d) => d.id === sid)?.creator ?? null;
        ledgerEntry({ creatorId: creator, seriesId: sid, orderId: o.id, kind: "share", grossCents: 99, ts: paidAt });
        grantEntitlement({ userId: u.id, kind: "series", refId: sid, orderId: o.id });
      } else {
        const planId = weighted(r, planWeights);
        const plan = planRows.find((p) => p.id === planId)!;
        const o = createOrder({
          id: `ord_s${(orderSeq++).toString(36)}`,
          userId: u.id, kind: "subscription", planId: plan.id, title: `VESPER VIP — ${plan.name}`,
          amountCents: plan.price_cents, gateway: method === "card" ? "stripe" : method, country: u.country,
          createdAt: paidAt, status: "paid",
        });
        insert("payments", { id: newId("pmt"), order_id: o.id, gateway: o.gateway, gateway_ref: `seed_${o.id}`, amount_cents: plan.price_cents, status: r() < 0.03 ? "failed" : "succeeded", method, raw: "{}", created_at: paidAt });
        ledgerEntry({ creatorId: null, seriesId: null, orderId: o.id, kind: "pool", grossCents: plan.price_cents, netCents: 0, note: `VIP ${plan.name}`, ts: paidAt });
        upsertSubscription({ userId: u.id, planId: plan.id, orderId: o.id, days: plan.days, gateway: o.gateway, startedAt: paidAt });
        run("UPDATE users SET vip_until = ? WHERE id = ?", paidAt + plan.days * DAY, u.id);
        // a slice of them churn
        if (r() < 0.22) run("UPDATE subscriptions SET auto_renew = 0, canceled_at = ? WHERE user_id = ?", paidAt + 5 * DAY, u.id);
      }
    }
    // ~19% of subscribers renew at least once — the funnel's last stage is real
    for (const sub of all<{ user_id: string; plan_id: string; paid_at: number; amount_cents: number; gateway: string; country: string }>(
      "SELECT user_id, plan_id, paid_at, amount_cents, gateway, country FROM orders WHERE status='paid' AND kind='subscription'"
    )) {
      if (r() > 0.19) continue;
      const plan = planRows.find((p) => p.id === sub.plan_id);
      if (!plan) continue;
      const renewAt = sub.paid_at + plan.days * DAY;
      if (renewAt > t0) continue;
      const o = createOrder({
        id: `ord_r${(orderSeq++).toString(36)}`,
        userId: sub.user_id, kind: "subscription", planId: plan.id,
        title: `VESPER VIP — ${plan.name} (renewal)`, amountCents: plan.price_cents,
        gateway: sub.gateway, country: sub.country, createdAt: renewAt, status: "paid",
      });
      insert("payments", { id: newId("pmt"), order_id: o.id, gateway: o.gateway, gateway_ref: `seed_${o.id}`, amount_cents: plan.price_cents, status: "succeeded", method: "auto", raw: "{}", created_at: renewAt });
      ledgerEntry({ creatorId: null, seriesId: null, orderId: o.id, kind: "pool", grossCents: plan.price_cents, netCents: 0, note: `VIP ${plan.name} renewal`, ts: renewAt });
      run("UPDATE users SET vip_until = MAX(vip_until, ?) WHERE id = ?", renewAt + plan.days * DAY, sub.user_id);
    }

    // a handful of refunds
    const refundables = all<{ id: string; user_id: string; amount_cents: number; paid_at: number }>(
      "SELECT id, user_id, amount_cents, paid_at FROM orders WHERE status='paid' ORDER BY paid_at DESC LIMIT 40"
    );
    refundables.slice(0, 14).forEach((o) => {
      run("UPDATE orders SET status='refunded' WHERE id = ?", o.id);
      insert("refunds", { id: newId("ref"), order_id: o.id, amount_cents: o.amount_cents, reason: "Customer request", status: "succeeded", operator_id: "usr_admin", created_at: o.paid_at + 2 * DAY });
    });

    console.log(`[seed] ${orderSeq} orders`);
  });

  /* --------------------------------- events -------------------------------- */
  // Real event rows for every seeded account across its whole lifetime — the
  // ops console then computes DAU, funnels and cohorts from data, not a curve.
  console.log("[seed] generating events…");
  const r2 = rng(777);
  const seriesIds = DRAMAS.map((d) => d.id);
  const allUsers = all<{ id: string; created_at: number }>("SELECT id, created_at FROM users WHERE id LIKE 'usr_s%'");
  tx(() => {
    for (const u of allUsers) {
      const lifetimeDays = Math.max(1, Math.floor((t0 - u.created_at) / DAY));
      insert("events", { ts: u.created_at, name: "install", user_id: u.id, series_id: null, episode_id: null, value: 0, props: "{}" });
      insert("events", { ts: u.created_at + 60_000, name: "sign_up", user_id: u.id, series_id: null, episode_id: null, value: 0, props: "{}" });

      // heavier at the start, thinning out — the shape every短剧 app sees
      const sessions = 1 + Math.floor(Math.pow(r2(), 1.7) * Math.min(18, 2 + lifetimeDays * 0.5));
      for (let s = 0; s < sessions; s++) {
        const dayOffset = Math.floor(Math.pow(r2(), 1.6) * lifetimeDays);
        const ts = u.created_at + dayOffset * DAY + Math.floor(r2() * DAY);
        if (ts > t0) continue;
        const sid = seriesIds[Math.floor(r2() * seriesIds.length)];
        insert("events", { ts, name: "session_start", user_id: u.id, series_id: null, episode_id: null, value: 0, props: "{}" });
        const plays = 1 + Math.floor(r2() * 4);
        for (let p = 0; p < plays; p++) {
          insert("events", { ts: ts + p * 90_000, name: "play_start", user_id: u.id, series_id: sid, episode_id: null, value: 0, props: "{}" });
          if (r2() < 0.72) {
            insert("events", { ts: ts + p * 90_000 + 60_000, name: "play_complete", user_id: u.id, series_id: sid, episode_id: null, value: 45 + Math.floor(r2() * 150), props: "{}" });
          }
        }
        if (r2() < 0.34) insert("events", { ts: ts + 300_000, name: "paywall_view", user_id: u.id, series_id: sid, episode_id: null, value: 0, props: "{}" });
        if (r2() < 0.09) insert("events", { ts: ts + 60_000, name: "favorite", user_id: u.id, series_id: sid, episode_id: null, value: 0, props: "{}" });
      }
    }
    // purchase events mirror the seeded orders so the funnel closes on real rows
    for (const o of all<{ user_id: string; paid_at: number; amount_cents: number }>("SELECT user_id, paid_at, amount_cents FROM orders WHERE status IN ('paid','refunded') AND paid_at IS NOT NULL")) {
      insert("events", { ts: o.paid_at, name: "purchase", user_id: o.user_id, series_id: null, episode_id: null, value: o.amount_cents / 100, props: "{}" });
    }
  });

  /* ------------------------- watching, lists, comments ---------------------- */
  // Progress rows are what "continue watching" and the VIP-pool settlement read,
  // so the platform has to look lived-in, not just visited.
  console.log("[seed] generating watch progress, lists and comments…");
  const r3 = rng(9091);
  const COMMENTS = [
    "Binged the whole thing in one night. No regrets.",
    "EP 12 broke me. Actually broke me.",
    "The pacing on this one is unreal — no filler at all.",
    "Whoever cast the lead deserves a raise.",
    "I came for the plot twist, stayed for the wardrobe.",
    "That cliffhanger is illegal. Where is episode 19.",
    "Rewatching just to catch what I missed the first time.",
    "The soundtrack in the rooftop scene lives in my head.",
    "Finally a revenge arc that doesn't lose its nerve halfway.",
    "My mum started watching over my shoulder and now she's ahead of me.",
    "Three episodes in and I already know how this ends. Watching anyway.",
    "The lighting in this is genuinely cinematic for a vertical.",
  ];

  tx(() => {
    const watchers = all<{ id: string; created_at: number }>(
      "SELECT id, created_at FROM users WHERE id LIKE 'usr_s%' ORDER BY created_at DESC LIMIT 3000"
    );
    for (const u of watchers) {
      const howMany = 1 + Math.floor(Math.pow(r3(), 1.6) * 5);
      for (let i = 0; i < howMany; i++) {
        const sid = seriesIds[Math.floor(r3() * seriesIds.length)];
        const eps = all<{ id: string; n: number }>("SELECT id, n FROM episodes WHERE series_id = ? ORDER BY n LIMIT 12", sid);
        if (!eps.length) continue;
        const ep = eps[Math.floor(r3() * eps.length)];
        const duration = 20;
        const done = r3() < 0.55;
        const ts = Math.min(t0 - Math.floor(r3() * 20 * DAY), t0 - 60_000);
        run(
          `INSERT INTO watch_progress(user_id, episode_id, series_id, position_s, duration_s, completed, updated_at)
           VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id, episode_id) DO NOTHING`,
          u.id, ep.id, sid, done ? duration : Math.round(duration * (0.15 + r3() * 0.7)), duration, done ? 1 : 0, ts
        );
      }
      if (r3() < 0.4) {
        const sid = seriesIds[Math.floor(r3() * seriesIds.length)];
        run("INSERT INTO favorites(user_id, series_id, created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING", u.id, sid, t0 - Math.floor(r3() * 30 * DAY));
      }
      if (r3() < 0.22) {
        const sid = seriesIds[Math.floor(r3() * seriesIds.length)];
        insert("comments", {
          id: newId("cmt"), user_id: u.id, series_id: sid, episode_id: null, parent_id: null,
          body: COMMENTS[Math.floor(r3() * COMMENTS.length)],
          likes: Math.floor(Math.pow(r3(), 2) * 240), status: "visible",
          created_at: t0 - Math.floor(r3() * 25 * DAY),
        });
      }
    }
    run("UPDATE series SET favorites = (SELECT COUNT(*) FROM favorites f WHERE f.series_id = series.id)");

    // the demo account has something to come back to
    for (const sid of ["her-silent-revenge", "the-last-heir", "cursed-by-the-moon", "midnight-vows"]) {
      const ep = get<{ id: string }>("SELECT id FROM episodes WHERE series_id = ? AND n = 2", sid);
      if (!ep) continue;
      run(
        `INSERT INTO watch_progress(user_id, episode_id, series_id, position_s, duration_s, completed, updated_at)
         VALUES(?,?,?,?,?,?,?) ON CONFLICT(user_id, episode_id) DO NOTHING`,
        "usr_demo", ep.id, sid, 8, 20, 0, t0 - Math.floor(rng(1)() * 3 * DAY)
      );
      run("INSERT INTO favorites(user_id, series_id, created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING", "usr_demo", sid, t0 - DAY);
    }

    // bullet comments on the openers of the top titles
    const DANMU = ["here we go", "goosebumps", "no way", "she did NOT", "rewind that", "this shot 🔥", "called it", "not the letter", "my heart", "第一集就上头"];
    for (const sid of ["her-silent-revenge", "the-last-heir", "cursed-by-the-moon", "the-dons-daughter", "midnight-vows"]) {
      const ep = get<{ id: string }>("SELECT id FROM episodes WHERE series_id = ? AND n = 1", sid);
      if (!ep) continue;
      for (let i = 0; i < 24; i++) {
        insert("danmaku", {
          id: newId("dmk"), user_id: null, episode_id: ep.id,
          t_ms: Math.floor(r3() * 19_000),
          body: DANMU[Math.floor(r3() * DANMU.length)],
          color: r3() < 0.15 ? "#ffd479" : "#ffffff",
          status: "visible", created_at: t0 - Math.floor(r3() * 10 * DAY),
        });
      }
    }
  });

  /* ------------------------------ daily rollups ----------------------------- */
  // Every one of the 90 rows is computed by the same rollupDay() the live
  // scheduler runs — seeded history and today's numbers are the same maths.
  console.log("[seed] rolling up 90 days…");
  tx(() => {
    for (let i = 89; i >= 0; i--) {
      rollupDay(new Date(startOfToday - i * DAY).toISOString().slice(0, 10));
    }
  });

  /* ---------------------------- payouts + settings -------------------------- */
  const rr = rng(4242);
  tx(() => {
    const period = new Date(startOfToday - 30 * DAY).toISOString().slice(0, 7);
    for (const c of all<{ id: string; name: string; share_bps: number }>("SELECT id, name, share_bps FROM creators")) {
      const gross = count("SELECT COALESCE(SUM(gross_cents),0) FROM ledger WHERE creator_id = ?", c.id) || 120000 + Math.floor(rr() * 400000);
      const net = Math.round((gross * c.share_bps) / 10000);
      createPayout({ creatorId: c.id, period, grossCents: gross, netCents: net, status: c.name === "Atlas Dramas" ? "hold" : "scheduled", scheduledAt: startOfToday + 5 * DAY });
    }

    /* --------------------------------- reports ------------------------------- */
    const reportSpec: [string, string, string][] = [
      ["scar-tissue", "Graphic violence", "Fight scene in EP12 is too explicit for the rating."],
      ["after-dark", "Copyright", "Music bed sounds like a licensed track."],
      ["neighbor-in-4b", "Misleading thumbnail", "Cover implies content that isn't in the episode."],
    ];
    reportSpec.forEach(([sid, reason, detail], i) =>
      insert("reports", {
        id: `rep_seed_${i}`, reporter_id: "usr_demo", target_type: "series", target_id: sid,
        reason, detail, status: "open", created_at: t0 - (i + 1) * 6 * 3600_000,
      })
    );

    /* -------------------------------- curation ------------------------------- */
    upsertRail({ id: "rail_top", title: "Top 10 this week", subtitle: "What everyone is bingeing", kind: "trending", sort: 1 });
    upsertRail({ id: "rail_new", title: "New & noteworthy", subtitle: "Fresh drops", kind: "new", sort: 2 });
    upsertRail({ id: "rail_billionaire", title: "Billionaire", kind: "genre", param: "billionaire", sort: 3 });
    upsertRail({ id: "rail_revenge", title: "Revenge", kind: "genre", param: "revenge", sort: 4 });
    upsertRail({ id: "rail_supernatural", title: "Supernatural", kind: "genre", param: "supernatural", sort: 5 });
    upsertRail({ id: "rail_completed", title: "Binge in one night", subtitle: "Completed seasons", kind: "completed", sort: 6 });

    [
      ["her-silent-revenge", "/hero/night-city.jpg"],
      ["the-last-heir", "/hero/penthouse.jpg"],
      ["cursed-by-the-moon", "/hero/moonlit-forest.jpg"],
      ["midnight-vows", "/hero/red-carpet.jpg"],
      ["neighbor-in-4b", "/hero/neon-district.jpg"],
    ].forEach(([sid, img], i) => {
      const d = DRAMAS.find((x) => x.id === sid)!;
      upsertBanner({ id: `ban_${i}`, title: d.title, subtitle: d.synopsis, seriesId: sid, imageUrl: img, link: `/title/${sid}`, sort: i });
    });

    setSetting("site.name", "VESPER", "seed");
    setSetting("pay.gateway", env.gateway, "seed");
  });

  /* ------------------------------- sample media ----------------------------- */
  if (opts.media !== false) {
    console.log("[seed] queueing sample media…");
    const rows = all<{ id: string; cover_url: string; title: string }>("SELECT id, cover_url, title FROM series WHERE status IN ('published','review') ORDER BY views DESC");
    for (const s of rows) {
      const asset = createAsset({ kind: "video", status: "queued", original_name: `${s.id}-sample.mp4`, mime: "video/mp4" });
      run("UPDATE episodes SET media_id = ? WHERE series_id = ?", asset.id, s.id);
      enqueue("sample-media", { assetId: asset.id, image: s.cover_url, seriesId: s.id });
    }
  }

  console.log("[seed] done.");
}

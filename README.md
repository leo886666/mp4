# VESPER — bite-size cinematic dramas

[![CI](https://github.com/leo886666/mp4/actions/workflows/ci.yml/badge.svg)](https://github.com/leo886666/mp4/actions/workflows/ci.yml)

A full-stack short-drama streaming platform: viewer app, Creator Studio and ops console,
on one Next.js 16 codebase with a real database, real video transcoding and a real
paywall.

```bash
npm install
npm run dev          # http://localhost:3300
```

Requires **Node 22.5+** — the database driver is Node's built-in `node:sqlite`.

That single command migrates the schema, seeds a believable platform (12 000 accounts,
41 series, 1 182 episodes, ~1 000 orders, 400 000 events), starts the job worker and
begins transcoding a sample HLS ladder for every series. Nothing else to configure.

| Account | Password | What it opens |
| --- | --- | --- |
| `demo@vesper.app` | `vesper2026` | viewer with an active VIP window |
| `creator@vesper.app` | `vesper2026` | Creator Studio (Emberlight Studio) |
| `reviewer@vesper.app` | `vesper2026` | console: review queue + reports |
| `admin@vesper.app` | `vesper2026` | console: everything except settings |
| `owner@vesper.app` | `vesper2026` | console: everything |

Verify the whole thing end to end:

```bash
npm run smoke        # 82 assertions: signup → paywall → pay → HLS bytes → upload
                     # → transcode → review → publish → refund → VIP revoked
```

---

## Map

| Route | What |
| --- | --- |
| `/` | Home: hero carousel, continue watching, Top 10, curated rails |
| `/discover` | Genre filter, sort, paginated grid |
| `/search` | Live search across titles, tags and studios |
| `/title/[id]` | Detail: episodes with lock state, comments, related |
| `/watch/[id]?ep=n` | Vertical player: HLS, gestures, danmaku, resume, paywall |
| `/vip` | Plans, promo codes, checkout, membership management |
| `/login` | Four equal providers — Google, X, Telegram, email (one field, no password) |
| `/checkout/[orderId]` | Hosted checkout (mock gateway) |
| `/me` `/me/history` `/me/favorites` `/me/orders` | Profile and account |
| `/studio` | Creator Studio: library, upload, monetization, earnings, payouts |
| `/admin/*` | Ops console — overview, users, payments, content, review queue, reports, promotion, payouts, settings, audit |
| `/legal/[slug]` | Terms, privacy, cookies, subscription, copyright, community |
| `/design` | Design system showcase |
| `/api/*` | The backend — see [docs/API.md](docs/API.md) |

## Architecture

```
app/                 routes — server components read the DB directly, client components call /api
  api/               67 route handlers: the backend
lib/
  server/
    db.ts            the only file that knows it's SQLite
    schema.ts        full DDL (30 tables)
    seed.ts          first-boot data
    boot.ts          migrate → seed → job worker (via instrumentation.ts)
    repo/            users · catalog · media · engagement · commerce · ops · stats
    services/        orders (checkout/fulfil/refund) · views (shared read models) · studio
    payments/        gateway interface + mock · stripe · apple/google IAP
    media.ts         ffmpeg → multi-bitrate HLS + poster + sprite
    storage.ts       StorageDriver: local disk | S3/R2 (SigV4, no SDK)
    entitlements.ts  the single place that decides whether bytes may flow
  client/            typed fetch wrapper, batched telemetry, resumable upload
storage/             runtime data (gitignored): vesper.db + media/ + uploads/
```

### Data

**SQLite via Node 22's built-in `node:sqlite`** — zero dependencies, zero services, real
transactions. WAL where the filesystem supports it, automatic fallback to a rollback
journal where it doesn't (network volumes refuse WAL's shared memory). Read-mostly
workloads like this scale comfortably to six-figure DAU on one box.

Moving to PostgreSQL means reimplementing four functions in `lib/server/db.ts`
(`all` / `get` / `run` / `tx`) plus the `?` → `$n` placeholder rewrite. Nothing above
that file uses SQLite-only syntax.

### Video

Video never touches the database.

```
upload (4 MB resumable parts) → media_assets(queued)
  → job 'transcode' → ffmpeg ladder (360/540/720, short side) → HLS + poster + sprite
  → media_assets(ready)
```

Playback is gated: `/api/episodes/[id]/play` checks the entitlement, then signs a
4-hour token. `/api/stream/...` refuses any manifest or segment without it, rewrites
playlists so child URLs carry the token, supports `Range`, and 302s to a CDN when
`VESPER_CDN_BASE` is set. The client is hls.js with native HLS on Safari and a
progressive MP4 fallback.

If `ffmpeg` is missing the pipeline degrades to progressive MP4 instead of failing.

### Money

`Gateway` is an interface with three methods — `createCheckout`, `parseWebhook`,
`refund`. `mock` implements it locally end-to-end (signed session token, hosted page,
signed webhook), `stripe` speaks Checkout Sessions over plain `fetch` with HMAC
signature verification, `apple`/`google` verify store receipts. Switching is one
env var; nothing downstream changes.

Revenue split: pay-per-episode is attributed to the creator at payment time (70% by
default, per-creator override). Subscription revenue lands in a pool and is split
monthly by watch time — `POST /api/admin/payouts` runs that settlement and writes
real ledger rows and payouts.

### Analytics

The console reads live SQL. `events` is the raw stream (the client batches through
`/api/events`); `daily_stats` is the rollup the charts read, recomputed for the current
day every five minutes by the same `rollupDay()` that seeded the history. Funnels and
cohorts are computed on demand over `users`, `events` and `orders` — no fixture data,
no hard-coded numbers.

### Never empty

Any series, episode or banner without artwork resolves — deterministically by id hash —
onto one of the 44 shipped images in `public/`. New creator series get a placeholder
cover immediately, and every seeded series gets a real Ken-Burns HLS sample built from
its own cover, so no player ever shows a black rectangle.

## Configuration

Copy `.env.example` to `.env.local`. Everything has a working default.

| Variable | Default | Notes |
| --- | --- | --- |
| `VESPER_DATA_DIR` | `./storage` | database + media |
| `VESPER_SECRET` | dev value | **set this in production** — signs sessions and playback tokens |
| `VESPER_STORAGE_DRIVER` | `local` | `local` \| `s3` |
| `VESPER_S3_*`, `VESPER_CDN_BASE` | — | S3/R2 bucket + public CDN base |
| `VESPER_FFMPEG` / `VESPER_FFPROBE` | `ffmpeg` / `ffprobe` | binaries |
| `VESPER_HLS_LADDER` | `360,540,720` | rendition short sides |
| `VESPER_PAYMENT_GATEWAY` | `mock` | `mock` \| `stripe` \| `apple` \| `google` |
| `VESPER_EMAIL_SIGNIN` | `instant` | `link` mails a signed 15-minute sign-in link instead of trusting the address |
| `VESPER_MAIL_FROM` | `VESPER <no-reply@vesper.app>` | wire your ESP into `lib/server/mail.ts` |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | — | required for `stripe` |
| `VESPER_SEED` / `VESPER_SEED_MEDIA` | `1` / `1` | set `0` for a bare production database |
| `NEXT_PUBLIC_WEBFONTS` | `1` | `0` drops the Google Fonts `<link>`. Fonts are never fetched at build time, so builds work offline and behind the GFW; the fallback stack in `globals.css` covers CN system faces. Self-host by dropping woff2 files in `public/fonts` and adding `@font-face` rules. |

## Deploying

```bash
npm run build && npm start
```

Needs a Node runtime with a writable volume for `storage/` and `ffmpeg` on `PATH`
(or `VESPER_STORAGE_DRIVER=s3` plus a transcode worker on the same image). Set
`VESPER_SECRET` and `VESPER_SEED=0`. Put a CDN in front of `VESPER_CDN_BASE` and the
stream route hands out redirects instead of proxying bytes.

### Docker

```bash
docker build -t vesper .
docker run -d -p 3300:3300 \
  -v vesper-data:/data \
  -e VESPER_SECRET="$(openssl rand -hex 32)" \
  vesper
```

The image ships `ffmpeg` and runs as the unprivileged `node` user. `/data` holds the
database, uploads and transcoded HLS — use a **named volume**; a bind mount needs
`chown 1000:1000` first. `VESPER_SEED` defaults to `0` in the image, so a production
container starts with an empty catalogue; set it to `1` for a demo deployment.

### CI

`.github/workflows/ci.yml` runs on every push and PR: typecheck → production build →
boot the server → the full 82-assertion smoke suite (with a real `ffmpeg` transcode),
plus a separate job that builds the Docker image and waits for its healthcheck.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | migrate + seed + worker + dev server on :3300 |
| `npm run build` / `npm start` | production build / server |
| `npm run smoke` | 82-assertion end-to-end test against a running server |
| `npm run db:reset` | delete the database and media, next boot reseeds |
| `npm run db:inspect` | row counts per table |

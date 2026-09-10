# VESPER API

Every endpoint lives under `/api`, speaks JSON, and returns the same envelope:

```jsonc
// success
{ "ok": true, "data": { … } }

// failure
{ "ok": false, "error": { "code": "payment_required", "message": "Unlock required", "details": { … } } }
```

| Code | Meaning |
| --- | --- |
| `bad_request` (400) | Validation failed — `message` names the field |
| `unauthorized` (401) | No session cookie, or it expired |
| `payment_required` (402) | Paywall. `details.requires` is `login` \| `vip` \| `purchase` |
| `forbidden` (403) | Signed in, but the role/permission is missing |
| `not_found` (404) | — |
| `conflict` (409) | e.g. email already registered |
| `server_error` (500) | Unhandled — logged server-side |

Route handlers run on the Node runtime and receive `params` as a promise
(Next 16): `ctx.params` is awaited once at the top of every handler.

**Auth** is cookie-based. Two independent scopes:

| Cookie | Scope | Set by |
| --- | --- | --- |
| `vesper_sid` | viewer + creator | `POST /api/auth/login`, `/register`, `/oauth/[provider]` |
| `vesper_admin_sid` | ops console | `POST /api/auth/admin` |

Both are `httpOnly`, `SameSite=Lax`, `Secure` in production, and are rows in `sessions`
(hashed token) so they can be revoked server-side.

---

## Auth

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | — | `{email, name, password}` → sets `vesper_sid` |
| `POST` | `/api/auth/login` | — | `{email, password}` |
| `POST` | `/api/auth/logout` | session | clears both cookies, revokes the session row |
| `GET` | `/api/auth/me` | optional | `{user, subscription, entitlements, creator, stats, unread}` |
| `PATCH` | `/api/auth/me` | session | `{name?, country?, avatarUrl?}` |
| `POST` | `/api/auth/oauth/[provider]` | — | `google` \| `x` \| `telegram`. Swap `resolveProfile()` for a real code exchange |
| `POST` | `/api/auth/email` | — | **email as a provider** — `{email}` is enough. See below |
| `GET` | `/api/auth/email/verify?t=` | — | magic-link landing → session + redirect |
| `POST` | `/api/auth/admin` | — | staff sign-in → `vesper_admin_sid` + permission list |
| `GET` | `/api/auth/admin` | admin | current console session |
| `DELETE` | `/api/auth/admin` | admin | console sign-out |

### Passwordless email

`POST /api/auth/email { email, password?, next? }`

| Situation | Response |
| --- | --- |
| Address unknown | account created, session issued → `{ user, created: true }` |
| Address known, no password, not staff | session issued → `{ user }` |
| Address has a password, or belongs to staff | `{ requiresPassword: true, name }` — **no session** |
| …retried with the right password | `{ user }` |
| …retried with the wrong password | `401 unauthorized` |
| `VESPER_EMAIL_SIGNIN=link` | `{ sent: true, devLink? }` — a signed 15-minute link is mailed; `devLink` only appears while no mail provider is wired up |

Typing a staff address can never take over that account: the password gate comes
before any session exists. `lib/server/mail.ts` is the seam for your ESP —
point `deliver()` at Resend/SES/Postmark and magic links, receipts and review
notifications all start sending.

## Catalogue

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/home` | optional | hero banners, continue-watching, top 10, curated rails |
| `GET` | `/api/series` | — | `?genre=&q=&sort=trending\|new\|rating\|views\|updated\|title&page=&perPage=` |
| `GET` | `/api/series/[id]` | optional | detail + episodes (with per-user lock state) + related + comments |
| `GET` | `/api/series/[id]/episodes` | optional | episode list only |
| `GET` | `/api/genres` | — | genres with published counts |
| `GET` | `/api/search` | — | `?q=` — titles, tags, synopsis and studio names |

## Playback

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/episodes/[id]/play` | optional | **the paywall.** 200 → signed token + HLS/MP4 sources; 402 → `details.requires` |
| `GET` | `/api/stream/[assetId]/[...path]` | token | `?t=` signed token. Rewrites playlists, supports `Range`, 302s to the CDN when configured |
| `POST` | `/api/progress` | optional | `{episodeId, positionS, durationS, completed}` — no-ops for guests |
| `GET`/`POST` | `/api/episodes/[id]/danmaku` | optional/session | bullet comments |
| `POST` | `/api/episodes/[id]/like` | session | — |

A playback token is an HMAC of `{assetId, episodeId, userId, exp}` with a 4-hour life
(`VESPER_PLAY_TOKEN`). Segment requests without a valid token get `403`, so a copied
`.m3u8` stops working when the token expires.

## Engagement

| Method | Path | Auth |
| --- | --- | --- |
| `POST` | `/api/series/[id]/favorite` | session |
| `GET`/`POST` | `/api/series/[id]/comments` | optional / session |
| `POST` | `/api/comments/[id]/like` | session |
| `POST` | `/api/reports` | optional |
| `POST` | `/api/events` | optional — batched client telemetry (≤50 per call) |

## Me

| Method | Path | Notes |
| --- | --- | --- |
| `GET`/`DELETE` | `/api/me/history` | `DELETE ?episodeId=` removes one row, no query clears all |
| `GET` | `/api/me/favorites` | |
| `GET` | `/api/me/orders` | receipts |
| `GET`/`POST` | `/api/me/subscription` | `POST {action:"cancel"\|"resume"}` |
| `GET`/`POST` | `/api/me/notifications` | `POST` marks all read |

## Commerce

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/plans` | — | active plans + configured gateway |
| `POST` | `/api/coupons/validate` | — | `{code, planId}` → `{valid, discount}` |
| `POST` | `/api/orders` | session | `{kind:"subscription"\|"episode"\|"series", planId?, refId?, couponCode?}` → `{order, checkoutUrl}` |
| `GET` | `/api/orders/[id]` | session | order + `confirmToken` for the hosted mock checkout |
| `POST` | `/api/payments/mock/confirm` | session | what the hosted checkout posts — goes through the webhook path |
| `POST` | `/api/webhooks/payments` | gateway-signed | one endpoint for every gateway |

**Order lifecycle**

```
POST /api/orders            → orders(status=pending) + gateway checkout session
  ↓ (hosted page / PSP)
POST /api/webhooks/payments → gateway.parseWebhook() authenticates
  ↓
fulfillOrder()  ── subscription → subscriptions + users.vip_until + ledger(pool)
                └─ episode/series → entitlements + ledger(share → creator balance)
  ↓
notifications + audit_logs + events(purchase)
```

## Creator Studio

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/api/studio/overview` | creator profile, counters, top series |
| `GET`/`POST` | `/api/studio/series` | list / create (draft) |
| `GET`/`PATCH`/`DELETE` | `/api/studio/series/[id]` | `DELETE` takes a published series offline rather than destroying it |
| `GET`/`POST` | `/api/studio/series/[id]/episodes` | |
| `PATCH`/`DELETE` | `/api/studio/episodes/[id]` | |
| `POST` | `/api/studio/series/[id]/submit` | → review queue |
| `GET` | `/api/studio/earnings` | balance, daily net, ledger, payouts |
| `GET`/`POST` | `/api/studio/payouts` | list / request withdrawal |

**Uploads** (resumable, 4 MB parts)

```
POST /api/uploads                      {filename,size,mime,kind} → {uploadId, partSize, parts}
PUT  /api/uploads/[id]?part=N          raw bytes                 → {percent}
POST /api/uploads/[id]/complete        → media_assets row + transcode job
GET  /api/media/[id]                   poll: queued → processing → ready
GET  /api/media/[id]?raw=1             image bytes (covers)
```

## Ops console

Every endpoint requires `vesper_admin_sid` **and** an explicit permission.

| Method | Path | Permission |
| --- | --- | --- |
| `GET` | `/api/admin/overview` | `console.view` |
| `GET` | `/api/admin/users` | `users.read` |
| `GET`/`PATCH` | `/api/admin/users/[id]` | `users.read` / `users.write` |
| `GET` | `/api/admin/orders` | `orders.read` |
| `POST` | `/api/admin/orders/[id]/refund` | `orders.refund` |
| `GET` | `/api/admin/content` | `content.read` |
| `PATCH` | `/api/admin/content/[id]` | `content.write` |
| `GET` | `/api/admin/reviews` | `content.read` |
| `POST` | `/api/admin/reviews/[id]` | `review.decide` |
| `GET` | `/api/admin/reports` | `reports.handle` |
| `POST` | `/api/admin/reports/[id]` | `reports.handle` |
| `GET`/`PATCH` | `/api/admin/comments` | `reports.handle` |
| `GET`/`POST` | `/api/admin/campaigns` | `console.view` / `campaigns.write` |
| `PATCH` | `/api/admin/campaigns/[id]` | `campaigns.write` |
| `GET`/`POST` | `/api/admin/payouts` | `console.view` / `payouts.write` |
| `POST` | `/api/admin/payouts/[id]` | `payouts.write` |
| `GET`/`PATCH` | `/api/admin/creators` | `content.read` / `content.write` |
| `GET`/`POST` | `/api/admin/curation` | `content.read` / `content.write` |
| `GET`/`PATCH` | `/api/admin/settings` | `console.view` / `settings.write` |
| `GET` | `/api/admin/audit` | `audit.read` |
| `GET`/`POST` | `/api/admin/jobs` | `console.view` / `content.write` |

### Roles → permissions

| Permission | reviewer | admin | owner |
| --- | :-: | :-: | :-: |
| `console.view` | ● | ● | ● |
| `content.read` / `review.decide` / `reports.handle` | ● | ● | ● |
| `users.read` / `orders.read` | ● | ● | ● |
| `users.write` / `orders.refund` / `content.write` | | ● | ● |
| `campaigns.write` / `payouts.write` / `audit.read` | | ● | ● |
| `settings.write` | | | ● |

`user` and `creator` have no console permissions at all — `POST /api/auth/admin`
rejects them with `403` before a session is even created.

## Health

`GET /api/health` — row counts, storage driver, gateway, job queue depth. No auth.

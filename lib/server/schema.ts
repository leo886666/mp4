/**
 * Full DDL for the VESPER platform.
 *
 * SQLite dialect (node:sqlite, WAL). Kept ANSI-plain on purpose: every
 * statement below runs unchanged on PostgreSQL after swapping INTEGER
 * timestamps for BIGINT and AUTOINCREMENT for BIGSERIAL — the repositories
 * in lib/server/repo/* never use SQLite-only syntax outside this file.
 *
 * Time columns are unix milliseconds (INTEGER). Money is integer cents.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA = `
------------------------------------------------------------------ identity --
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  name          TEXT NOT NULL,
  initials      TEXT NOT NULL,
  avatar_url    TEXT,
  password_hash TEXT,
  role          TEXT NOT NULL DEFAULT 'user',      -- user|creator|reviewer|admin|owner
  status        TEXT NOT NULL DEFAULT 'active',    -- active|suspended|deleted
  vip_until     INTEGER DEFAULT 0,
  coins         INTEGER NOT NULL DEFAULT 0,
  country       TEXT DEFAULT 'US',
  locale        TEXT DEFAULT 'en',
  channel       TEXT,                              -- acquisition channel
  campaign_id   TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  last_seen_at  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role    ON users(role);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,                      -- google|x|telegram
  provider_uid TEXT NOT NULL,
  email        TEXT,
  created_at   INTEGER NOT NULL,
  UNIQUE(provider, provider_uid)
);

CREATE TABLE IF NOT EXISTS sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  scope      TEXT NOT NULL DEFAULT 'site',         -- site|admin
  user_agent TEXT,
  ip         TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

------------------------------------------------------------------- catalog --
CREATE TABLE IF NOT EXISTS genres (
  id   TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS creators (
  id            TEXT PRIMARY KEY,
  user_id       TEXT REFERENCES users(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  initials      TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'Creator',   -- Creator|Premium Studio
  followers     INTEGER NOT NULL DEFAULT 0,
  share_bps     INTEGER NOT NULL DEFAULT 7000,     -- 70.00% revenue share
  status        TEXT NOT NULL DEFAULT 'active',
  balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS series (
  id             TEXT PRIMARY KEY,
  title          TEXT NOT NULL,
  genre_id       TEXT REFERENCES genres(id),
  creator_id     TEXT REFERENCES creators(id),
  synopsis       TEXT NOT NULL DEFAULT '',
  cover_url      TEXT NOT NULL,
  hero_url       TEXT,
  tags           TEXT NOT NULL DEFAULT '[]',       -- json array
  status         TEXT NOT NULL DEFAULT 'draft',    -- draft|review|published|rejected|offline
  ongoing        INTEGER NOT NULL DEFAULT 1,
  updated_label  TEXT DEFAULT 'Updated weekly',
  rating         REAL NOT NULL DEFAULT 8.5,
  views          INTEGER NOT NULL DEFAULT 0,
  likes          INTEGER NOT NULL DEFAULT 0,
  favorites      INTEGER NOT NULL DEFAULT 0,
  episode_count  INTEGER NOT NULL DEFAULT 0,
  free_episodes  INTEGER NOT NULL DEFAULT 3,
  monetization   TEXT NOT NULL DEFAULT 'vip',      -- free|vip|ppe
  ppe_price_cents INTEGER NOT NULL DEFAULT 99,
  is_new         INTEGER NOT NULL DEFAULT 0,
  featured       INTEGER NOT NULL DEFAULT 0,
  review_note    TEXT,
  published_at   INTEGER,
  created_at     INTEGER NOT NULL,
  updated_at     INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_series_status ON series(status);
CREATE INDEX IF NOT EXISTS idx_series_genre  ON series(genre_id);
CREATE INDEX IF NOT EXISTS idx_series_views  ON series(views DESC);

CREATE TABLE IF NOT EXISTS episodes (
  id          TEXT PRIMARY KEY,
  series_id   TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  n           INTEGER NOT NULL,
  title       TEXT NOT NULL,
  duration_s  INTEGER NOT NULL DEFAULT 0,
  access      TEXT NOT NULL DEFAULT 'vip',         -- free|vip|ppe
  price_cents INTEGER NOT NULL DEFAULT 0,
  media_id    TEXT REFERENCES media_assets(id),
  poster_url  TEXT,
  status      TEXT NOT NULL DEFAULT 'published',   -- draft|review|published|offline
  views       INTEGER NOT NULL DEFAULT 0,
  likes       INTEGER NOT NULL DEFAULT 0,
  publish_at  INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL,
  UNIQUE(series_id, n)
);
CREATE INDEX IF NOT EXISTS idx_episodes_series ON episodes(series_id, n);

CREATE TABLE IF NOT EXISTS media_assets (
  id            TEXT PRIMARY KEY,
  kind          TEXT NOT NULL DEFAULT 'video',     -- video|image
  owner_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'queued',    -- queued|processing|ready|failed
  original_name TEXT,
  mime          TEXT,
  bytes         INTEGER NOT NULL DEFAULT 0,
  duration_s    REAL NOT NULL DEFAULT 0,
  width         INTEGER NOT NULL DEFAULT 0,
  height        INTEGER NOT NULL DEFAULT 0,
  source_key    TEXT,                              -- storage key of the original
  hls_key       TEXT,                              -- storage key of master.m3u8
  mp4_key       TEXT,                              -- progressive fallback
  poster_key    TEXT,
  sprite_key    TEXT,
  variants      TEXT NOT NULL DEFAULT '[]',        -- json [{height,bitrate,key}]
  error         TEXT,
  created_at    INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE CASCADE,
  filename     TEXT,
  mime         TEXT,
  bytes_total  INTEGER NOT NULL DEFAULT 0,
  bytes_done   INTEGER NOT NULL DEFAULT 0,
  parts        INTEGER NOT NULL DEFAULT 0,
  storage_key  TEXT,
  status       TEXT NOT NULL DEFAULT 'open',       -- open|complete|aborted
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL
);

---------------------------------------------------------------- engagement --
CREATE TABLE IF NOT EXISTS watch_progress (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  series_id  TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  position_s REAL NOT NULL DEFAULT 0,
  duration_s REAL NOT NULL DEFAULT 0,
  completed  INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, episode_id)
);
CREATE INDEX IF NOT EXISTS idx_progress_user ON watch_progress(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_id  TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, series_id)
);

CREATE TABLE IF NOT EXISTS likes (
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,                       -- series|episode|comment
  target_id   TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  series_id  TEXT NOT NULL REFERENCES series(id) ON DELETE CASCADE,
  episode_id TEXT REFERENCES episodes(id) ON DELETE SET NULL,
  parent_id  TEXT REFERENCES comments(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  likes      INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'visible',      -- visible|hidden|removed
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_series ON comments(series_id, created_at DESC);

CREATE TABLE IF NOT EXISTS danmaku (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  episode_id TEXT NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  t_ms       INTEGER NOT NULL,
  body       TEXT NOT NULL,
  color      TEXT DEFAULT '#ffffff',
  status     TEXT NOT NULL DEFAULT 'visible',
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_danmaku_ep ON danmaku(episode_id, t_ms);

CREATE TABLE IF NOT EXISTS reports (
  id          TEXT PRIMARY KEY,
  reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,                       -- series|episode|comment|user
  target_id   TEXT NOT NULL,
  reason      TEXT NOT NULL,
  detail      TEXT,
  status      TEXT NOT NULL DEFAULT 'open',        -- open|resolved|dismissed
  handled_by  TEXT REFERENCES users(id),
  handled_at  INTEGER,
  resolution  TEXT,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  read_at    INTEGER,
  created_at INTEGER NOT NULL
);

------------------------------------------------------------------ commerce --
CREATE TABLE IF NOT EXISTS plans (
  id             TEXT PRIMARY KEY,
  name           TEXT NOT NULL,
  price_cents    INTEGER NOT NULL,
  period         TEXT NOT NULL,
  days           INTEGER NOT NULL,
  per_month_cents INTEGER,
  badge          TEXT,
  savings        TEXT,
  highlight      INTEGER NOT NULL DEFAULT 0,
  active         INTEGER NOT NULL DEFAULT 1,
  sort           INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,                    -- subscription|episode|series|coins
  plan_id        TEXT REFERENCES plans(id),
  ref_id         TEXT,                             -- episode/series id for PPE
  title          TEXT NOT NULL DEFAULT '',
  amount_cents   INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'pending',  -- pending|paid|failed|refunded|canceled
  gateway        TEXT NOT NULL DEFAULT 'mock',
  gateway_ref    TEXT,
  coupon_code    TEXT,
  country        TEXT,
  created_at     INTEGER NOT NULL,
  paid_at        INTEGER,
  meta           TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_orders_user    ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS payments (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  gateway      TEXT NOT NULL,
  gateway_ref  TEXT,
  amount_cents INTEGER NOT NULL,
  status       TEXT NOT NULL,                      -- succeeded|failed|pending
  method       TEXT,
  raw          TEXT,
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
  id           TEXT PRIMARY KEY,
  order_id     TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  reason       TEXT,
  status       TEXT NOT NULL DEFAULT 'succeeded',
  operator_id  TEXT REFERENCES users(id),
  created_at   INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id                 TEXT PRIMARY KEY,
  user_id            TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id            TEXT NOT NULL REFERENCES plans(id),
  order_id           TEXT REFERENCES orders(id),
  status             TEXT NOT NULL DEFAULT 'active',  -- active|canceled|expired
  auto_renew         INTEGER NOT NULL DEFAULT 1,
  started_at         INTEGER NOT NULL,
  current_period_end INTEGER NOT NULL,
  canceled_at        INTEGER,
  gateway            TEXT NOT NULL DEFAULT 'mock'
);
CREATE INDEX IF NOT EXISTS idx_subs_user ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS entitlements (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,                        -- episode|series
  ref_id     TEXT NOT NULL,
  order_id   TEXT REFERENCES orders(id),
  granted_at INTEGER NOT NULL,
  expires_at INTEGER,
  UNIQUE(user_id, kind, ref_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  code       TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,                        -- percent|amount
  value      INTEGER NOT NULL,
  plan_ids   TEXT NOT NULL DEFAULT '[]',
  max_uses   INTEGER NOT NULL DEFAULT 0,
  used       INTEGER NOT NULL DEFAULT 0,
  starts_at  INTEGER,
  ends_at    INTEGER,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ledger (
  id          TEXT PRIMARY KEY,
  ts          INTEGER NOT NULL,
  creator_id  TEXT REFERENCES creators(id) ON DELETE SET NULL,
  series_id   TEXT REFERENCES series(id) ON DELETE SET NULL,
  order_id    TEXT REFERENCES orders(id) ON DELETE SET NULL,
  kind        TEXT NOT NULL,                       -- share|adjust|payout
  gross_cents INTEGER NOT NULL DEFAULT 0,
  share_bps   INTEGER NOT NULL DEFAULT 7000,
  net_cents   INTEGER NOT NULL DEFAULT 0,
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_ledger_creator ON ledger(creator_id, ts DESC);

CREATE TABLE IF NOT EXISTS payouts (
  id           TEXT PRIMARY KEY,
  creator_id   TEXT NOT NULL REFERENCES creators(id) ON DELETE CASCADE,
  period       TEXT NOT NULL,
  gross_cents  INTEGER NOT NULL,
  net_cents    INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending',    -- pending|scheduled|paid|hold
  method       TEXT DEFAULT 'bank',
  scheduled_at INTEGER,
  paid_at      INTEGER,
  operator_id  TEXT REFERENCES users(id),
  note         TEXT,
  created_at   INTEGER NOT NULL
);

----------------------------------------------------------------------- ops --
CREATE TABLE IF NOT EXISTS review_items (
  id            TEXT PRIMARY KEY,
  target_type   TEXT NOT NULL,                     -- series|episode|cover
  target_id     TEXT NOT NULL,
  series_id     TEXT REFERENCES series(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  kind          TEXT NOT NULL,
  submitted_by  TEXT REFERENCES users(id) ON DELETE SET NULL,
  submitter_name TEXT,
  note          TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending|approved|rejected
  decided_by    TEXT REFERENCES users(id),
  decided_at    INTEGER,
  decision_note TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_review_status ON review_items(status, created_at DESC);

CREATE TABLE IF NOT EXISTS campaigns (
  id          TEXT PRIMARY KEY,
  channel     TEXT NOT NULL,
  name        TEXT NOT NULL,
  spend_cents INTEGER NOT NULL DEFAULT 0,
  installs    INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'running',     -- running|paused|ended
  utm         TEXT,
  started_at  INTEGER,
  ended_at    INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         INTEGER NOT NULL,
  name       TEXT NOT NULL,
  user_id    TEXT,
  series_id  TEXT,
  episode_id TEXT,
  value      REAL NOT NULL DEFAULT 0,
  props      TEXT NOT NULL DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_events_ts   ON events(ts);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name, ts);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id, ts);

CREATE TABLE IF NOT EXISTS daily_stats (
  date           TEXT PRIMARY KEY,                 -- YYYY-MM-DD
  dau            INTEGER NOT NULL DEFAULT 0,
  new_users      INTEGER NOT NULL DEFAULT 0,
  installs       INTEGER NOT NULL DEFAULT 0,
  revenue_cents  INTEGER NOT NULL DEFAULT 0,
  orders         INTEGER NOT NULL DEFAULT 0,
  watch_minutes  INTEGER NOT NULL DEFAULT 0,
  paywall_views  INTEGER NOT NULL DEFAULT 0,
  purchases      INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  ts          INTEGER NOT NULL,
  actor_id    TEXT,
  actor_name  TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  detail      TEXT,
  ip          TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit_logs(ts DESC);

CREATE TABLE IF NOT EXISTS banners (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  subtitle    TEXT,
  series_id   TEXT REFERENCES series(id) ON DELETE SET NULL,
  image_url   TEXT NOT NULL,
  link        TEXT,
  sort        INTEGER NOT NULL DEFAULT 0,
  active      INTEGER NOT NULL DEFAULT 1,
  starts_at   INTEGER,
  ends_at     INTEGER,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rails (
  id      TEXT PRIMARY KEY,
  title   TEXT NOT NULL,
  subtitle TEXT,
  kind    TEXT NOT NULL,                           -- trending|genre|new|manual|completed
  param   TEXT,
  ids     TEXT NOT NULL DEFAULT '[]',
  sort    INTEGER NOT NULL DEFAULT 0,
  active  INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS jobs (
  id          TEXT PRIMARY KEY,
  kind        TEXT NOT NULL,
  payload     TEXT NOT NULL DEFAULT '{}',
  status      TEXT NOT NULL DEFAULT 'queued',      -- queued|running|done|failed
  attempts    INTEGER NOT NULL DEFAULT 0,
  error       TEXT,
  progress    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL,
  started_at  INTEGER,
  finished_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status, created_at);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

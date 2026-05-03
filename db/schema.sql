-- Formulens v4.0 — PostgreSQL Schema
-- Run via: npm run db:migrate

-- ── users ─────────────────────────────────────────────────────────────────
-- Mirrors Clerk user records for relational joins.
-- Populated lazily on first authenticated search.
CREATE TABLE IF NOT EXISTS users (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id   TEXT        UNIQUE NOT NULL,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── search_history ────────────────────────────────────────────────────────
-- Silent input logging. Guests logged by ip_hash only (no PII stored).
CREATE TABLE IF NOT EXISTS search_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        REFERENCES users(id) ON DELETE SET NULL,
  clerk_id        TEXT,
  herbs           TEXT[]      NOT NULL DEFAULT '{}',
  drugs           TEXT[]      NOT NULL DEFAULT '{}',
  result_severity TEXT,
  ip_hash         TEXT,
  searched_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id    ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_clerk_id   ON search_history(clerk_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at DESC);

-- ── shared_links ──────────────────────────────────────────────────────────
-- One-time (or limited-view) tokens for sharing a result set.
CREATE TABLE IF NOT EXISTS shared_links (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT        UNIQUE NOT NULL,
  user_id    UUID        REFERENCES users(id) ON DELETE CASCADE,
  payload    JSONB       NOT NULL,
  view_count INT         NOT NULL DEFAULT 0,
  max_views  INT         NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_links_token   ON shared_links(token);
CREATE INDEX IF NOT EXISTS idx_shared_links_user_id ON shared_links(user_id);

-- ── attribution_events ────────────────────────────────────────────────────
-- Partner tracking rows consumed by daily digest reports.
CREATE TABLE IF NOT EXISTS attribution_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  user_id      UUID        REFERENCES users(id) ON DELETE SET NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  occurred_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attribution_partner  ON attribution_events(partner_code);
CREATE INDEX IF NOT EXISTS idx_attribution_occurred ON attribution_events(occurred_at DESC);

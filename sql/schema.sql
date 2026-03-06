-- ============================================================
-- Client Reporting Dashboard — Database Schema
-- Run against Neon PostgreSQL
-- ============================================================

-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE clients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  logo_url    TEXT,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'client')),
  client_id     UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ============================================================
-- DATA SOURCE CONFIG (per client)
-- ============================================================

CREATE TYPE source_type AS ENUM (
  'ga4', 'gsc', 'google_ads', 'meta',
  'lsa', 'servicetitan', 'gbp'
);

CREATE TABLE client_data_sources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source      source_type NOT NULL,
  config      JSONB DEFAULT '{}',
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, source)
);

-- ============================================================
-- REPORT PERIODS (one per client per month)
-- ============================================================

CREATE TABLE report_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  overview     JSONB DEFAULT '{}',
  railshop_notes   TEXT,
  next_priorities  TEXT[],
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, period_start)
);

-- ============================================================
-- REPORT SECTIONS (one per data source per period)
-- ============================================================

CREATE TABLE report_sections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_period_id UUID NOT NULL REFERENCES report_periods(id) ON DELETE CASCADE,
  source           source_type NOT NULL,
  kpis             JSONB NOT NULL DEFAULT '[]',
  tables           JSONB NOT NULL DEFAULT '[]',
  railshop_notes   TEXT,
  next_priorities  TEXT[],
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_period_id, source)
);

-- ============================================================
-- CAMPAIGN METRICS (granular campaign-level data)
-- ============================================================

CREATE TABLE campaign_metrics (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,
  campaign_name     TEXT NOT NULL,
  campaign_type     TEXT,
  metrics           JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_section_id, campaign_name)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_users_client ON users(client_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_report_periods_client ON report_periods(client_id);
CREATE INDEX idx_report_periods_lookup ON report_periods(client_id, period_start);
CREATE INDEX idx_report_sections_period ON report_sections(report_period_id);
CREATE INDEX idx_campaign_metrics_section ON campaign_metrics(report_section_id);
CREATE INDEX idx_client_data_sources_client ON client_data_sources(client_id);

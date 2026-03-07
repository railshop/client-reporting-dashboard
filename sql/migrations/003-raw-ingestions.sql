-- Migration 003: raw_ingestions table (SSOT for API data)

CREATE TABLE IF NOT EXISTS raw_ingestions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source          source_type NOT NULL,
  period_start    DATE NOT NULL,
  raw_data        JSONB NOT NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, source, period_start)
);

CREATE INDEX IF NOT EXISTS idx_raw_ingestions_lookup ON raw_ingestions(client_id, source, period_start);
CREATE INDEX IF NOT EXISTS idx_raw_ingestions_client_period ON raw_ingestions(client_id, period_start);

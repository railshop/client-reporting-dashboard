-- Epic A: Source Filters table for campaign/entity selection per data source
CREATE TABLE IF NOT EXISTS source_filters (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data_source_id  UUID NOT NULL REFERENCES client_data_sources(id) ON DELETE CASCADE,
  filter_type     TEXT NOT NULL,
  filter_value    TEXT NOT NULL,
  label           TEXT,
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(data_source_id, filter_type, filter_value)
);

CREATE INDEX IF NOT EXISTS idx_source_filters_ds ON source_filters(data_source_id);

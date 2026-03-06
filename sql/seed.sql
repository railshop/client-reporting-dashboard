-- ============================================================
-- Seed Data for Client Reporting Dashboard
-- ============================================================
-- NOTE: Password for all seed users is 'railshop2026'
-- bcrypt hash generated with 10 rounds

-- ============================================================
-- CLIENTS
-- ============================================================

INSERT INTO clients (slug, name, active) VALUES
  ('country-farms', 'Country Farms', true),
  ('fire-and-ice', 'Fire & Ice', true),
  ('jp-operations', 'JP Operations', true),
  ('cedar-creek', 'Cedar Creek', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- ADMIN USER
-- ============================================================
-- Password: railshop2026
-- Hash: $2a$10$xJ8Kx6Q5R4h3H4E6Gf7Y8OQZ2Wq1E3R4T5Y6U7I8O9P0A1B2C3D4

INSERT INTO users (email, password_hash, name, role, client_id) VALUES
  ('drew@railshop.co', '$2b$10$fOg0qPydVozvW.E6OEPhHu3L7kxcpy5lAvGF9X42jM8emz26Dv902', 'Drew', 'admin', NULL),
  ('sean@railshop.co', '$2b$10$fOg0qPydVozvW.E6OEPhHu3L7kxcpy5lAvGF9X42jM8emz26Dv902', 'Sean', 'admin', NULL)
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- CLIENT USERS (one per client)
-- ============================================================

INSERT INTO users (email, password_hash, name, role, client_id)
SELECT
  'reports@countryfarms.com',
  '$2b$10$fOg0qPydVozvW.E6OEPhHu3L7kxcpy5lAvGF9X42jM8emz26Dv902',
  'Country Farms Team',
  'client',
  id
FROM clients WHERE slug = 'country-farms'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password_hash, name, role, client_id)
SELECT
  'reports@fireandice.com',
  '$2b$10$fOg0qPydVozvW.E6OEPhHu3L7kxcpy5lAvGF9X42jM8emz26Dv902',
  'Fire & Ice Team',
  'client',
  id
FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- CLIENT DATA SOURCES
-- ============================================================

-- Country Farms: GA4, GSC, LSA, Google Ads, Meta
INSERT INTO client_data_sources (client_id, source)
SELECT id, 'ga4'::source_type FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'gsc'::source_type FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'lsa'::source_type FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'google_ads'::source_type FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'meta'::source_type FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, source) DO NOTHING;

-- Fire & Ice: GA4, GSC, Google Ads, Meta, ServiceTitan
INSERT INTO client_data_sources (client_id, source)
SELECT id, 'ga4'::source_type FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'gsc'::source_type FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'google_ads'::source_type FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'meta'::source_type FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (client_id, source) DO NOTHING;

INSERT INTO client_data_sources (client_id, source)
SELECT id, 'servicetitan'::source_type FROM clients WHERE slug = 'fire-and-ice'
ON CONFLICT (client_id, source) DO NOTHING;

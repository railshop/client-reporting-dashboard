-- ============================================================
-- Sample Data: Country Farms — March 2025
-- Mirrors the V1 prototype exactly
-- ============================================================

-- Create report period
INSERT INTO report_periods (client_id, period_start, status, overview, railshop_notes, next_priorities, published_at)
SELECT
  id,
  '2025-03-01',
  'published',
  '{
    "headline": "March was a <em>strong month.</em>",
    "summary": "Lead volume up 22% MoM. LSA fully utilized budget for the first time since October. PMax gaining efficiency each week. Meta is in its learning phase — expect CPL improvements in April as the algorithm trains.",
    "hero_stats": [
      {"label": "Total Leads", "value": "187", "delta": "22%", "direction": "up", "color": "blue"},
      {"label": "Total Spend", "value": "$4,820", "delta": "96.4% of budget", "direction": "neutral", "color": "gold"},
      {"label": "Blended CPL", "value": "$25.77", "delta": "18%", "direction": "down", "color": "default"},
      {"label": "Sessions", "value": "3,241", "delta": "14%", "direction": "up", "color": "default"}
    ],
    "platform_cards": [
      {
        "platform": "Google LSA",
        "metrics": [{"label": "Leads", "value": "94"}, {"label": "CPL", "value": "$21.28"}],
        "spend": "$2,000"
      },
      {
        "platform": "Google PMax",
        "metrics": [{"label": "Conv.", "value": "63"}, {"label": "ROAS", "value": "3.2×"}],
        "spend": "$1,700"
      },
      {
        "platform": "Meta Ads",
        "metrics": [{"label": "Leads", "value": "30"}, {"label": "CPL", "value": "$37.33"}],
        "spend": "$1,120"
      }
    ]
  }'::jsonb,
  NULL,
  NULL,
  now()
FROM clients WHERE slug = 'country-farms'
ON CONFLICT (client_id, period_start) DO UPDATE SET
  overview = EXCLUDED.overview,
  status = EXCLUDED.status,
  published_at = EXCLUDED.published_at;

-- ============================================================
-- GA4 Section (Website tab)
-- ============================================================
INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
SELECT
  rp.id,
  'ga4'::source_type,
  '[
    {"label": "Sessions", "value": "3,241", "delta": "14%", "direction": "up", "color": "default"},
    {"label": "Users", "value": "2,618", "delta": "11%", "direction": "up", "color": "default"},
    {"label": "Engagement Rate", "value": "62%", "delta": "4pp", "direction": "up", "color": "blue"},
    {"label": "Avg. Session", "value": "2m 14s", "delta": "Stable", "direction": "neutral", "color": "default"}
  ]'::jsonb,
  '{
    "channelBreakdown": {
      "title": "Traffic by Channel",
      "columns": [
        {"key": "channel", "label": "Channel", "align": "left"},
        {"key": "sessions", "label": "Sessions", "align": "right"},
        {"key": "share", "label": "Share", "align": "right"},
        {"key": "conv", "label": "Conv %", "align": "right"}
      ],
      "rows": [
        {"channel": "Paid Search", "sessions": "1,024", "share": "31.6%", "conv": "6.2%"},
        {"channel": "Organic", "sessions": "892", "share": "27.5%", "conv": "4.1%"},
        {"channel": "Direct", "sessions": "611", "share": "18.8%", "conv": "3.8%"},
        {"channel": "Paid Social", "sessions": "482", "share": "14.9%", "conv": "2.9%"},
        {"channel": "Referral", "sessions": "232", "share": "7.2%", "conv": "1.2%"}
      ]
    },
    "topLandingPages": {
      "title": "Top Landing Pages",
      "columns": [
        {"key": "page", "label": "Page", "align": "left"},
        {"key": "sessions", "label": "Sessions", "align": "right"},
        {"key": "avgTime", "label": "Avg. Time", "align": "right"},
        {"key": "bounce", "label": "Bounce", "align": "right"},
        {"key": "leads", "label": "Leads", "align": "right"}
      ],
      "rows": [
        {"page": "/ (Homepage)", "sessions": "1,140", "avgTime": "1m 48s", "bounce": "42%", "leads": "18"},
        {"page": "/lawn-care-services", "sessions": "624", "avgTime": "2m 31s", "bounce": "34%", "leads": "29"},
        {"page": "/spring-turf-offer", "sessions": "488", "avgTime": "3m 02s", "bounce": "28%", "leads": "41"},
        {"page": "/about-us", "sessions": "312", "avgTime": "1m 12s", "bounce": "56%", "leads": "4"},
        {"page": "/contact", "sessions": "289", "avgTime": "0m 58s", "bounce": "22%", "leads": "31"}
      ]
    }
  }'::jsonb,
  NULL,
  NULL
FROM report_periods rp
JOIN clients c ON rp.client_id = c.id
WHERE c.slug = 'country-farms' AND rp.period_start = '2025-03-01'
ON CONFLICT (report_period_id, source) DO UPDATE SET
  kpis = EXCLUDED.kpis,
  tables = EXCLUDED.tables;

-- ============================================================
-- GSC Section (SEO tab)
-- ============================================================
INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
SELECT
  rp.id,
  'gsc'::source_type,
  '[
    {"label": "Total Clicks", "value": "1,840", "delta": "9%", "direction": "up", "color": "blue"},
    {"label": "Total Impressions", "value": "48,200", "delta": "14%", "direction": "up", "color": "default"},
    {"label": "Avg. CTR", "value": "3.8%", "delta": "0.2pp", "direction": "down", "color": "default"},
    {"label": "Avg. Position", "value": "14.2", "delta": "1.4", "direction": "up", "color": "blue"}
  ]'::jsonb,
  '{
    "topQueries": {
      "title": "Top Queries",
      "columns": [
        {"key": "query", "label": "Query", "align": "left"},
        {"key": "clicks", "label": "Clicks", "align": "right"},
        {"key": "impressions", "label": "Impr.", "align": "right"},
        {"key": "position", "label": "Position", "align": "right"}
      ],
      "rows": [
        {"query": "lawn care near me", "clicks": "214", "impressions": "3,800", "position": "4.2"},
        {"query": "country farms lawn", "clicks": "188", "impressions": "1,200", "position": "1.8"},
        {"query": "lawn fertilization [city]", "clicks": "142", "impressions": "4,100", "position": "9.4"},
        {"query": "spring lawn treatment", "clicks": "98", "impressions": "2,900", "position": "12.1"},
        {"query": "turf care services", "clicks": "74", "impressions": "1,800", "position": "7.6"}
      ]
    },
    "topPages": {
      "title": "Top Performing Pages",
      "columns": [
        {"key": "page", "label": "Page", "align": "left"},
        {"key": "clicks", "label": "Clicks", "align": "right"},
        {"key": "impressions", "label": "Impr.", "align": "right"},
        {"key": "ctr", "label": "CTR", "align": "right"},
        {"key": "position", "label": "Position", "align": "right"}
      ],
      "rows": [
        {"page": "/spring-turf-offer", "clicks": "388", "impressions": "7,400", "ctr": "5.2%", "position": "6.1"},
        {"page": "/lawn-care-services", "clicks": "312", "impressions": "9,200", "ctr": "3.4%", "position": "11.4"},
        {"page": "/ (Homepage)", "clicks": "290", "impressions": "6,100", "ctr": "4.8%", "position": "8.2"},
        {"page": "/fertilization", "clicks": "188", "impressions": "5,400", "ctr": "3.5%", "position": "14.6"},
        {"page": "/lawn-aeration", "clicks": "142", "impressions": "4,200", "ctr": "3.4%", "position": "16.8"}
      ]
    },
    "positionDistribution": {
      "title": "Position Distribution",
      "columns": [
        {"key": "range", "label": "Position Range", "align": "left"},
        {"key": "keywords", "label": "Keywords", "align": "right"},
        {"key": "share", "label": "Share", "align": "right"},
        {"key": "mom", "label": "MoM", "align": "right"}
      ],
      "rows": [
        {"range": "Top 3", "keywords": "12", "share": "9%", "mom": "+3"},
        {"range": "4 – 10 (Page 1)", "keywords": "38", "share": "28%", "mom": "+6"},
        {"range": "11 – 20 (Page 2)", "keywords": "54", "share": "40%", "mom": "+4"},
        {"range": "21 – 50", "keywords": "31", "share": "23%", "mom": "-8"}
      ]
    },
    "deviceBreakdown": {
      "title": "Device Breakdown",
      "columns": [
        {"key": "device", "label": "Device", "align": "left"},
        {"key": "clicks", "label": "Clicks", "align": "right"},
        {"key": "impressions", "label": "Impr.", "align": "right"},
        {"key": "ctr", "label": "CTR", "align": "right"},
        {"key": "position", "label": "Position", "align": "right"}
      ],
      "rows": [
        {"device": "Mobile", "clicks": "1,104", "impressions": "30,200", "ctr": "3.7%", "position": "15.1"},
        {"device": "Desktop", "clicks": "644", "impressions": "15,800", "ctr": "4.1%", "position": "12.8"},
        {"device": "Tablet", "clicks": "92", "impressions": "2,200", "ctr": "4.2%", "position": "13.4"}
      ]
    }
  }'::jsonb,
  'Average position improved by 1.4 spots MoM — consistent upward trend driven by the /spring-turf-offer page gaining traction.\n12 keywords now ranking in top 3, up from 9 in February. "Lawn care near me" holding at position 4.2 — worth targeting for a featured snippet push.\nMobile accounts for 60% of organic clicks. Page speed on mobile landing pages should be reviewed — opportunity to improve CTR from current 3.7%.\nRecommend adding FAQ schema markup to /fertilization and /lawn-aeration to target position 21–50 keywords still on page 2.',
  NULL
FROM report_periods rp
JOIN clients c ON rp.client_id = c.id
WHERE c.slug = 'country-farms' AND rp.period_start = '2025-03-01'
ON CONFLICT (report_period_id, source) DO UPDATE SET
  kpis = EXCLUDED.kpis,
  tables = EXCLUDED.tables,
  railshop_notes = EXCLUDED.railshop_notes;

-- ============================================================
-- LSA Section
-- ============================================================
INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
SELECT
  rp.id,
  'lsa'::source_type,
  '[
    {"label": "Leads", "value": "84", "delta": "+12.0%", "direction": "up", "color": "default"},
    {"label": "Impressions", "value": "4,970", "delta": "+8.3%", "direction": "up", "color": "default"},
    {"label": "Impression \u2192 Lead", "value": "1.7%", "delta": "+3.4%", "direction": "up", "color": "default"},
    {"label": "Absolute Top Rate", "value": "67.2%", "delta": "+2.1%", "direction": "up", "color": "default"},
    {"label": "Spend", "value": "$3,709.06", "delta": "+7.5%", "direction": "up", "color": "default"}
  ]'::jsonb,
  '{}'::jsonb,
  'Budget fully utilized for the first time since October — strong seasonal signal heading into spring.\nDisputed 3 calls flagged as spam. Awaiting Google credit of ~$63 applied to April.\nRecommending LSA budget increase to $2,200 in April given lead strength and remaining CPL headroom.',
  NULL
FROM report_periods rp
JOIN clients c ON rp.client_id = c.id
WHERE c.slug = 'country-farms' AND rp.period_start = '2025-03-01'
ON CONFLICT (report_period_id, source) DO UPDATE SET
  kpis = EXCLUDED.kpis,
  tables = EXCLUDED.tables,
  railshop_notes = EXCLUDED.railshop_notes;

-- ============================================================
-- Google Ads Section (PMax tab)
-- ============================================================
INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
SELECT
  rp.id,
  'google_ads'::source_type,
  '[
    {"label": "Impressions", "value": "41.2K", "delta": "31%", "direction": "up", "color": "default"},
    {"label": "Clicks", "value": "618", "delta": "22%", "direction": "up", "color": "default"},
    {"label": "Conversions", "value": "63", "delta": "29%", "direction": "up", "color": "blue"},
    {"label": "ROAS", "value": "3.2\u00d7", "delta": "0.4\u00d7", "direction": "up", "color": "gold"}
  ]'::jsonb,
  '{
    "assetGroupPerformance": {
      "title": "Asset Groups",
      "columns": [
        {"key": "group", "label": "Group", "align": "left"},
        {"key": "conversions", "label": "Conv.", "align": "right"},
        {"key": "rating", "label": "Rating", "align": "right"}
      ],
      "rows": [
        {"group": "Spring Lawn Care", "conversions": "38", "rating": "BEST"},
        {"group": "General Services", "conversions": "19", "rating": "GOOD"},
        {"group": "Brand Awareness", "conversions": "6", "rating": "LOW"}
      ]
    }
  }'::jsonb,
  'Consolidating budget toward Spring Lawn Care in April — clear conversion winner.\nPausing Brand Awareness (rated Low) and reallocating spend to top performers.\n4 new seasonal headline variants going live in early April.',
  NULL
FROM report_periods rp
JOIN clients c ON rp.client_id = c.id
WHERE c.slug = 'country-farms' AND rp.period_start = '2025-03-01'
ON CONFLICT (report_period_id, source) DO UPDATE SET
  kpis = EXCLUDED.kpis,
  tables = EXCLUDED.tables,
  railshop_notes = EXCLUDED.railshop_notes;

-- ============================================================
-- Meta Section
-- ============================================================
INSERT INTO report_sections (report_period_id, source, kpis, tables, railshop_notes, next_priorities)
SELECT
  rp.id,
  'meta'::source_type,
  '[
    {"label": "Reach", "value": "18.4K", "delta": "Freq: 1.8\u00d7", "direction": "neutral", "color": "default"},
    {"label": "Link Clicks", "value": "312", "delta": "CTR 0.94%", "direction": "neutral", "color": "default"},
    {"label": "Leads", "value": "30", "delta": "First full month", "direction": "neutral", "color": "blue"},
    {"label": "Cost Per Lead", "value": "$37.33", "delta": "Learning", "direction": "neutral", "color": "default"}
  ]'::jsonb,
  '{
    "creativeBreakdown": {
      "title": "Creative Performance",
      "columns": [
        {"key": "ad", "label": "Ad / Format", "align": "left"},
        {"key": "impressions", "label": "Impr.", "align": "right"},
        {"key": "ctr", "label": "CTR", "align": "right"},
        {"key": "leads", "label": "Leads", "align": "right"},
        {"key": "cpl", "label": "CPL", "align": "right"}
      ],
      "rows": [
        {"ad": "Spring Special \u2014 Image", "impressions": "14,200", "ctr": "1.12%", "leads": "18", "cpl": "$31.11"},
        {"ad": "Before/After \u2014 Video", "impressions": "10,800", "ctr": "0.84%", "leads": "9", "cpl": "$42.22"},
        {"ad": "Services \u2014 Carousel", "impressions": "8,000", "ctr": "0.62%", "leads": "3", "cpl": "$57.33"}
      ]
    }
  }'::jsonb,
  'First full month. CPL elevated but expected — still in learning phase. Target: $28 CPL by month 3.\nImage creative significantly outperforming video and carousel. Doubling down in April.\nHomeowners 35–60, 25mi radius with spring seasonal interest overlay is working — expanding slightly in April.',
  NULL
FROM report_periods rp
JOIN clients c ON rp.client_id = c.id
WHERE c.slug = 'country-farms' AND rp.period_start = '2025-03-01'
ON CONFLICT (report_period_id, source) DO UPDATE SET
  kpis = EXCLUDED.kpis,
  tables = EXCLUDED.tables,
  railshop_notes = EXCLUDED.railshop_notes;

-- ============================================================
-- Report-level notes & priorities (Overview tab)
-- ============================================================
UPDATE report_periods
SET
  railshop_notes = 'Strong month across the board. Lead volume is trending up and CPL is trending down — exactly where we want to be heading into spring peak season.',
  next_priorities = ARRAY[
    'Refresh Meta creative — image set exiting the learning phase. Introduce 2 new spring variants targeting homeowners 35–60 within 25mi.',
    'Increase PMax budget by $300. Early ROAS signals are strong and we haven''t hit diminishing returns on lead volume.',
    'Launch a dedicated spring turf landing page. Current homepage landing is losing ~30% of paid visitors before conversion.'
  ]
WHERE client_id = (SELECT id FROM clients WHERE slug = 'country-farms')
  AND period_start = '2025-03-01';

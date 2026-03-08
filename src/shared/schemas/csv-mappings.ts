import type { SourceType } from './sources';

export interface CsvColumnDef {
  field: string;
  label: string;
  type: 'string' | 'number' | 'currency';
  required?: boolean;
}

export interface CsvSourceMapping {
  label: string;
  description: string;
  mode: 'summary' | 'detail';
  columns: CsvColumnDef[];
}

// Per-source CSV column definitions.
// 'summary' mode: one row of aggregate metrics → raw_data.current
// 'detail' mode: many rows (campaigns, leads, etc.) → raw_data.rows + computed summary
export const CSV_SOURCE_MAPPINGS: Partial<Record<SourceType, CsvSourceMapping>> = {
  ga4: {
    label: 'Website (GA4)',
    description: 'Import GA4 summary metrics. One row with aggregate values.',
    mode: 'summary',
    columns: [
      { field: 'newUsers', label: 'New Users', type: 'number', required: true },
      { field: 'sessions', label: 'Sessions', type: 'number', required: true },
      { field: 'organicSessions', label: 'Organic Sessions', type: 'number' },
      { field: 'directSessions', label: 'Direct Sessions', type: 'number' },
      { field: 'paidSessions', label: 'Paid Sessions', type: 'number' },
      // TODO: Add conversions once GA4 conversion events are configured per client
      // { field: 'conversions', label: 'Conversions', type: 'number' },
    ],
  },
  gsc: {
    label: 'SEO (Search Console)',
    description: 'Import Search Console summary metrics.',
    mode: 'summary',
    columns: [
      { field: 'clicks', label: 'Clicks', type: 'number', required: true },
      { field: 'impressions', label: 'Impressions', type: 'number', required: true },
      { field: 'ctr', label: 'CTR', type: 'number' },
      { field: 'position', label: 'Avg Position', type: 'number' },
    ],
  },
  google_ads: {
    label: 'Google Ads',
    description: 'Import Google Ads campaign data. Each row is a campaign.',
    mode: 'detail',
    columns: [
      { field: 'campaign_name', label: 'Campaign', type: 'string', required: true },
      { field: 'campaign_type', label: 'Campaign Type', type: 'string' },
      { field: 'impressions', label: 'Impressions', type: 'number' },
      { field: 'clicks', label: 'Clicks', type: 'number' },
      { field: 'conversions', label: 'Conversions', type: 'number' },
      { field: 'spend', label: 'Spend', type: 'currency' },
    ],
  },
  meta: {
    label: 'Meta Ads',
    description: 'Import Meta campaign data. Each row is a campaign.',
    mode: 'detail',
    columns: [
      { field: 'campaign_name', label: 'Campaign', type: 'string', required: true },
      { field: 'reach', label: 'Reach', type: 'number' },
      { field: 'impressions', label: 'Impressions', type: 'number' },
      { field: 'clicks', label: 'Clicks', type: 'number' },
      { field: 'leads', label: 'Leads', type: 'number' },
      { field: 'spend', label: 'Spend', type: 'currency' },
    ],
  },
  servicetitan: {
    label: 'ServiceTitan',
    description: 'Campaign Tracking - Jobs Booked Performance report (.xlsx or .csv). Only "RS -" campaigns are imported.',
    mode: 'detail',
    columns: [
      { field: 'campaign_name', label: 'Campaign Name', type: 'string', required: true },
      { field: 'jobs_booked', label: 'Total Jobs Booked', type: 'number', required: true },
      { field: 'jobs_booked_new', label: 'Jobs Booked from New Customers', type: 'number' },
      { field: 'jobs_booked_existing', label: 'Jobs Booked from Existing Customers', type: 'number' },
      { field: 'completed_revenue', label: 'Completed Revenue', type: 'currency' },
      { field: 'total_sales', label: 'Total Sales', type: 'currency' },
      { field: 'opportunity_conversion_rate', label: 'Opportunity Conversion Rate', type: 'number' },
      { field: 'revenue_per_lead', label: 'Revenue Per Lead', type: 'currency' },
      { field: 'total_job_average', label: 'Total Job Average', type: 'currency' },
    ],
  },
  gbp: {
    label: 'Google Business Profile',
    description: 'Import GBP summary metrics. One row with aggregate values.',
    mode: 'summary',
    columns: [
      { field: 'totalImpressions', label: 'Total Impressions', type: 'number' },
      { field: 'mapsImpressions', label: 'Maps Impressions', type: 'number' },
      { field: 'searchImpressions', label: 'Search Impressions', type: 'number' },
      { field: 'calls', label: 'Phone Calls', type: 'number' },
      { field: 'websiteClicks', label: 'Website Clicks', type: 'number' },
      { field: 'directions', label: 'Direction Requests', type: 'number' },
    ],
  },
};

/** Parse a cell value based on column type */
export function parseCsvValue(value: string, type: CsvColumnDef['type']): string | number {
  const trimmed = value.trim();
  if (!trimmed) return type === 'string' ? '' : 0;

  if (type === 'number') {
    const num = Number(trimmed.replace(/[,%]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  if (type === 'currency') {
    const num = Number(trimmed.replace(/[$,]/g, ''));
    return isNaN(num) ? 0 : num;
  }
  return trimmed;
}

/** Build raw_data JSONB from parsed CSV rows and column mappings */
export function buildRawDataFromCsv(
  source: SourceType,
  rows: Record<string, string | number>[],
  mapping: CsvSourceMapping
): Record<string, any> {
  if (mapping.mode === 'summary') {
    // Single-row summary: first row becomes `current`, no `previous`
    const current: Record<string, any> = {};
    const row = rows[0] || {};
    for (const col of mapping.columns) {
      current[col.field] = row[col.field] ?? 0;
    }
    return { current, previous: {} };
  }

  // Detail mode: store all rows + compute aggregates
  if (source === 'google_ads' || source === 'meta') {
    const totals: Record<string, number> = {};
    for (const col of mapping.columns) {
      if (col.type === 'number' || col.type === 'currency') {
        totals[col.field] = rows.reduce((s, r) => s + (Number(r[col.field]) || 0), 0);
      }
    }
    const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    return {
      current: { ...totals, ctr },
      previous: {},
      campaigns: rows,
    };
  }

  if (source === 'servicetitan') {
    // Only keep rows whose campaign_name starts with "RS - "
    const filtered = rows.filter((r) => String(r.campaign_name || '').startsWith('RS - '));
    const totalJobsBooked = filtered.reduce((s, r) => s + (Number(r.jobs_booked) || 0), 0);
    const totalJobsNew = filtered.reduce((s, r) => s + (Number(r.jobs_booked_new) || 0), 0);
    const totalJobsExisting = filtered.reduce((s, r) => s + (Number(r.jobs_booked_existing) || 0), 0);
    const completedRevenue = filtered.reduce((s, r) => s + (Number(r.completed_revenue) || 0), 0);
    const totalSales = filtered.reduce((s, r) => s + (Number(r.total_sales) || 0), 0);
    const avgConversionRate = filtered.length > 0
      ? filtered.reduce((s, r) => s + (Number(r.opportunity_conversion_rate) || 0), 0) / filtered.length
      : 0;
    const avgRevenuePerLead = filtered.length > 0
      ? filtered.reduce((s, r) => s + (Number(r.revenue_per_lead) || 0), 0) / filtered.length
      : 0;
    const avgJobAverage = filtered.length > 0
      ? filtered.reduce((s, r) => s + (Number(r.total_job_average) || 0), 0) / filtered.length
      : 0;
    return {
      current: {
        totalJobsBooked,
        jobsBookedNew: totalJobsNew,
        jobsBookedExisting: totalJobsExisting,
        completedRevenue,
        totalSales,
        opportunityConversionRate: avgConversionRate,
        revenuePerLead: avgRevenuePerLead,
        totalJobAverage: avgJobAverage,
      },
      previous: {},
      campaigns: filtered,
    };
  }

  // Generic fallback: store rows as-is
  return { rows };
}

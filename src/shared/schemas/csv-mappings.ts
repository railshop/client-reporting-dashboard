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
  lsa: {
    label: 'Local Services Ads',
    description: 'Import LSA lead data. Each row represents a lead.',
    mode: 'detail',
    columns: [
      { field: 'lead_type', label: 'Lead Type', type: 'string', required: true },
      { field: 'status', label: 'Status', type: 'string' },
      { field: 'category', label: 'Category/Service', type: 'string' },
      { field: 'date', label: 'Date', type: 'string' },
      { field: 'charged', label: 'Charged', type: 'currency' },
      { field: 'customer_name', label: 'Customer Name', type: 'string' },
      { field: 'customer_phone', label: 'Phone', type: 'string' },
      { field: 'zip_code', label: 'Zip Code', type: 'string' },
    ],
  },
  ga4: {
    label: 'Website (GA4)',
    description: 'Import GA4 summary metrics. One row with aggregate values.',
    mode: 'summary',
    columns: [
      { field: 'sessions', label: 'Sessions', type: 'number', required: true },
      { field: 'users', label: 'Users', type: 'number' },
      { field: 'newUsers', label: 'New Users', type: 'number' },
      { field: 'pageviews', label: 'Pageviews', type: 'number' },
      { field: 'avgSessionDuration', label: 'Avg Session Duration (sec)', type: 'number' },
      { field: 'bounceRate', label: 'Bounce Rate', type: 'number' },
      { field: 'conversions', label: 'Conversions', type: 'number' },
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
    description: 'Import ServiceTitan job data. Each row is a job type summary.',
    mode: 'detail',
    columns: [
      { field: 'type', label: 'Job Type', type: 'string', required: true },
      { field: 'count', label: 'Count', type: 'number' },
      { field: 'revenue', label: 'Revenue', type: 'currency' },
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
  if (source === 'lsa') {
    const totalLeads = rows.length;
    const totalSpend = rows.reduce((s, r) => s + (Number(r.charged) || 0), 0);
    const leadsByType: Record<string, number> = {};
    const leadsByStatus: Record<string, number> = {};
    const leadsByCategory: Record<string, number> = {};
    for (const r of rows) {
      const lt = String(r.lead_type || 'Unknown');
      const st = String(r.status || 'Unknown');
      const cat = String(r.category || 'Unknown');
      leadsByType[lt] = (leadsByType[lt] || 0) + 1;
      leadsByStatus[st] = (leadsByStatus[st] || 0) + 1;
      leadsByCategory[cat] = (leadsByCategory[cat] || 0) + 1;
    }
    return {
      current: {
        totalLeads,
        totalSpend,
        costPerLead: totalLeads > 0 ? totalSpend / totalLeads : 0,
        leadsByType,
        leadsByStatus,
        leadsByCategory,
      },
      previous: {},
      leads: rows,
    };
  }

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
    const totalJobs = rows.reduce((s, r) => s + (Number(r.count) || 0), 0);
    const totalRevenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
    return {
      current: {
        totalJobs,
        completedJobs: totalJobs,
        totalRevenue,
        avgTicket: totalJobs > 0 ? totalRevenue / totalJobs : 0,
      },
      previous: {},
      jobsByType: rows,
    };
  }

  // Generic fallback: store rows as-is
  return { rows };
}

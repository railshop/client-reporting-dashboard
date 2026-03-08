import { formatNumber, formatPercent, calcDelta } from './data-pull-utils';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

interface TransformResult {
  kpis: any[];
  tables: Record<string, any>;
  campaigns?: any[];
}

function transformGA4(raw: Record<string, any>): TransformResult {
  const current = raw.current;
  const previous = raw.previous;

  const metricKeys: Array<{ label: string; key: string; format?: 'duration' | 'bounceRate' }> = [
    { label: 'Sessions', key: 'sessions' },
    { label: 'Users', key: 'users' },
    { label: 'New Users', key: 'newUsers' },
    { label: 'Pageviews', key: 'pageviews' },
    { label: 'Avg Duration', key: 'avgSessionDuration', format: 'duration' },
    { label: 'Bounce Rate', key: 'bounceRate', format: 'bounceRate' },
    { label: 'Conversions', key: 'conversions' },
  ];

  const kpis = metricKeys.map(({ label, key, format }) => {
    const cur = current[key] || 0;
    const prev = previous[key] || 0;
    let value: string;
    if (format === 'duration') {
      const mins = Math.floor(cur / 60);
      const secs = Math.round(cur % 60);
      value = `${mins}m ${secs}s`;
    } else if (format === 'bounceRate') {
      value = formatPercent(cur * 100);
    } else {
      value = formatNumber(cur);
    }
    return { label, value, ...calcDelta(cur, prev), color: 'default' as const };
  });

  return {
    kpis,
    tables: {
      channelBreakdown: {
        title: 'Channel Breakdown',
        columns: [
          { key: 'channel', label: 'Channel', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
          { key: 'users', label: 'Users', align: 'right' },
          { key: 'conversions', label: 'Conversions', align: 'right' },
        ],
        rows: raw.channelBreakdown || [],
      },
      topLandingPages: {
        title: 'Top Landing Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
          { key: 'conversions', label: 'Conversions', align: 'right' },
        ],
        rows: raw.topLandingPages || [],
      },
    },
  };
}

function transformGSC(raw: Record<string, any>): TransformResult {
  const cur = raw.current;
  const prv = raw.previous;

  const kpis = [
    { label: 'Clicks', value: formatNumber(cur.clicks), ...calcDelta(cur.clicks, prv.clicks), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(cur.impressions), ...calcDelta(cur.impressions, prv.impressions), color: 'default' as const },
    { label: 'CTR', value: formatPercent(cur.ctr * 100), ...calcDelta(cur.ctr * 100, prv.ctr * 100), color: 'default' as const },
    { label: 'Avg Position', value: cur.position.toFixed(1), ...calcDelta(prv.position, cur.position), color: 'default' as const },
  ];

  return {
    kpis,
    tables: {
      topQueries: {
        title: 'Top Search Queries',
        columns: [
          { key: 'query', label: 'Query', align: 'left' },
          { key: 'clicks', label: 'Clicks', align: 'right' },
          { key: 'impressions', label: 'Impressions', align: 'right' },
          { key: 'ctr', label: 'CTR', align: 'right' },
          { key: 'position', label: 'Position', align: 'right' },
        ],
        rows: raw.topQueries || [],
      },
      topPages: {
        title: 'Top Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'clicks', label: 'Clicks', align: 'right' },
          { key: 'impressions', label: 'Impressions', align: 'right' },
          { key: 'ctr', label: 'CTR', align: 'right' },
        ],
        rows: raw.topPages || [],
      },
    },
  };
}

function transformGoogleAds(raw: Record<string, any>): TransformResult {
  const cur = raw.current;
  const prv = raw.previous;

  const kpis = [
    { label: 'Impressions', value: formatNumber(cur.impressions), ...calcDelta(cur.impressions, prv.impressions), color: 'default' as const },
    { label: 'Clicks', value: formatNumber(cur.clicks), ...calcDelta(cur.clicks, prv.clicks), color: 'default' as const },
    { label: 'CTR', value: formatPercent(cur.ctr), ...calcDelta(cur.ctr, prv.ctr), color: 'default' as const },
    { label: 'Conversions', value: formatNumber(cur.conversions), ...calcDelta(cur.conversions, prv.conversions), color: 'default' as const },
    { label: 'Spend', value: '$' + cur.spend.toFixed(2), ...calcDelta(cur.costMicros, prv.costMicros), color: 'default' as const },
    { label: 'Cost/Conv', value: '$' + (cur.conversions > 0 ? (cur.spend / cur.conversions).toFixed(2) : '0.00'), ...calcDelta(prv.costPerConversion, cur.costPerConversion), color: 'default' as const },
  ];

  const campaigns = (raw.campaigns || []).map((c: any) => {
    const spend = c.costMicros / 1_000_000;
    return {
      campaign_name: c.name,
      campaign_type: c.channelType,
      metrics: {
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: formatPercent(c.clicks > 0 ? (c.clicks / c.impressions) * 100 : 0),
        cpc: '$' + (c.clicks > 0 ? (spend / c.clicks).toFixed(2) : '0.00'),
        conversions: c.conversions,
        cost_per_conversion: '$' + (c.conversions > 0 ? (spend / c.conversions).toFixed(2) : '0.00'),
        spend: '$' + spend.toFixed(2),
      },
    };
  });

  return { kpis, tables: {}, campaigns };
}

function transformMeta(raw: Record<string, any>): TransformResult {
  const cur = raw.current;
  const prv = raw.previous;

  const kpis = [
    { label: 'Reach', value: formatNumber(cur.reach), ...calcDelta(cur.reach, prv.reach), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(cur.impressions), ...calcDelta(cur.impressions, prv.impressions), color: 'default' as const },
    { label: 'Clicks', value: formatNumber(cur.clicks), ...calcDelta(cur.clicks, prv.clicks), color: 'default' as const },
    { label: 'CTR', value: formatPercent(cur.ctr), ...calcDelta(cur.ctr, prv.ctr), color: 'default' as const },
    { label: 'Leads', value: formatNumber(cur.leads), ...calcDelta(cur.leads, prv.leads), color: 'default' as const },
    { label: 'CPL', value: cur.leads > 0 ? '$' + (cur.spend / cur.leads).toFixed(2) : 'N/A', ...calcDelta(prv.cpl, cur.cpl), color: 'default' as const },
    { label: 'Spend', value: '$' + cur.spend.toFixed(2), ...calcDelta(cur.spend, prv.spend), color: 'default' as const },
  ];

  const campaigns = (raw.campaigns || []).map((c: any) => ({
    campaign_name: c.campaign_name,
    campaign_type: 'Meta',
    metrics: {
      reach: c.reach,
      frequency: c.frequency.toFixed(2),
      impressions: c.impressions,
      clicks: c.clicks,
      ctr: formatPercent(c.ctr),
      leads: c.leads,
      cpl: c.leads > 0 ? '$' + (c.spend / c.leads).toFixed(2) : 'N/A',
      spend: '$' + c.spend.toFixed(2),
    },
  }));

  return { kpis, tables: {}, campaigns };
}

function transformServiceTitan(raw: Record<string, any>): TransformResult {
  const cur = raw.current || {};

  const fmt$ = (v: number) => '$' + (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

  const kpis = [
    { label: 'Jobs Booked', value: formatNumber(cur.totalJobsBooked || 0), color: 'default' as const },
    { label: 'New Customers', value: formatNumber(cur.jobsBookedNew || 0), color: 'default' as const },
    { label: 'Existing Customers', value: formatNumber(cur.jobsBookedExisting || 0), color: 'default' as const },
    { label: 'Completed Revenue', value: fmt$(cur.completedRevenue || 0), color: 'default' as const },
    { label: 'Total Sales', value: fmt$(cur.totalSales || 0), color: 'default' as const },
    { label: 'Conversion Rate', value: formatPercent((cur.opportunityConversionRate || 0) * 100), color: 'default' as const },
    { label: 'Revenue / Lead', value: fmt$(cur.revenuePerLead || 0), color: 'default' as const },
    { label: 'Avg Job Total', value: fmt$(cur.totalJobAverage || 0), color: 'default' as const },
  ];

  const campaigns = (raw.campaigns || [])
    .sort((a: any, b: any) => (Number(b.completed_revenue) || 0) - (Number(a.completed_revenue) || 0))
    .map((c: any) => ({
      campaign: String(c.campaign_name || ''),
      jobs_booked: String(c.jobs_booked || 0),
      new_customers: String(c.jobs_booked_new || 0),
      existing_customers: String(c.jobs_booked_existing || 0),
      completed_revenue: fmt$(Number(c.completed_revenue) || 0),
      total_sales: fmt$(Number(c.total_sales) || 0),
    }));

  return {
    kpis,
    tables: {
      campaignPerformance: {
        title: 'Campaign Performance',
        columns: [
          { key: 'campaign', label: 'Campaign', align: 'left' },
          { key: 'jobs_booked', label: 'Jobs', align: 'right' },
          { key: 'new_customers', label: 'New', align: 'right' },
          { key: 'existing_customers', label: 'Existing', align: 'right' },
          { key: 'completed_revenue', label: 'Revenue', align: 'right' },
          { key: 'total_sales', label: 'Sales', align: 'right' },
        ],
        rows: campaigns,
      },
    },
  };
}

function transformGBP(raw: Record<string, any>): TransformResult {
  const cur = raw.current;
  const prv = raw.previous;

  const kpis = [
    { label: 'Total Views', value: formatNumber(cur.totalImpressions), ...calcDelta(cur.totalImpressions, prv.totalImpressions), color: 'default' as const },
    { label: 'Maps Views', value: formatNumber(cur.mapsImpressions), ...calcDelta(cur.mapsImpressions, prv.mapsImpressions), color: 'default' as const },
    { label: 'Search Views', value: formatNumber(cur.searchImpressions), ...calcDelta(cur.searchImpressions, prv.searchImpressions), color: 'default' as const },
    { label: 'Phone Calls', value: formatNumber(cur.calls), ...calcDelta(cur.calls, prv.calls), color: 'default' as const },
    { label: 'Website Clicks', value: formatNumber(cur.websiteClicks), ...calcDelta(cur.websiteClicks, prv.websiteClicks), color: 'default' as const },
    { label: 'Direction Requests', value: formatNumber(cur.directions), ...calcDelta(cur.directions, prv.directions), color: 'default' as const },
  ];

  return { kpis, tables: {} };
}

const transformFunctions: Partial<Record<SourceType, (raw: Record<string, any>) => TransformResult>> = {
  ga4: transformGA4,
  gsc: transformGSC,
  google_ads: transformGoogleAds,
  meta: transformMeta,
  servicetitan: transformServiceTitan,
  gbp: transformGBP,
};

export function transformRawData(source: SourceType, rawData: Record<string, any>): TransformResult | null {
  const fn = transformFunctions[source];
  if (!fn) return null;
  return fn(rawData);
}

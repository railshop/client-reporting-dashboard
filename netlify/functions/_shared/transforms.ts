import { formatNumber, formatPercent, formatDollars, calcDelta } from './data-pull-utils';
import { computeChannelRollups, type ChannelRollup } from './servicetitan-channel-map';

type SourceType = 'ga4' | 'gsc' | 'google_ads' | 'meta' | 'lsa' | 'servicetitan' | 'gbp';

interface TransformResult {
  kpis: any[];
  tables: Record<string, any>;
  campaigns?: any[];
  channelRollups?: Record<string, ChannelRollup>;
}

function transformGA4(raw: Record<string, any>): TransformResult {
  const cur = raw.current || {};
  const prv = raw.previous || {};

  const kpis = [
    { label: 'New Users', value: formatNumber(cur.newUsers || 0), ...calcDelta(cur.newUsers || 0, prv.newUsers || 0), color: 'default' as const },
    { label: 'Sessions', value: formatNumber(cur.sessions || 0), ...calcDelta(cur.sessions || 0, prv.sessions || 0), color: 'default' as const },
    { label: 'Organic Sessions', value: formatNumber(cur.organicSessions || 0), ...calcDelta(cur.organicSessions || 0, prv.organicSessions || 0), color: 'default' as const },
    { label: 'Direct Sessions', value: formatNumber(cur.directSessions || 0), ...calcDelta(cur.directSessions || 0, prv.directSessions || 0), color: 'default' as const },
    { label: 'Paid Sessions', value: formatNumber(cur.paidSessions || 0), ...calcDelta(cur.paidSessions || 0, prv.paidSessions || 0), color: 'default' as const },
    // TODO: Add conversions KPI once GA4 conversion events are configured per client
  ];

  return {
    kpis,
    tables: {
      channelBreakdown: {
        title: 'Channel Breakdown',
        columns: [
          { key: 'channel', label: 'Channel', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
        ],
        rows: raw.channelBreakdown || [],
      },
      topLandingPages: {
        title: 'Top Landing Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
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
    { label: 'Conversions', value: formatNumber(cur.conversions), ...calcDelta(cur.conversions, prv.conversions), color: 'default' as const },
    { label: 'Spend', value: formatDollars(cur.spend), ...calcDelta(cur.costMicros, prv.costMicros), color: 'default' as const },
    { label: 'Cost/Conv', value: formatDollars(cur.conversions > 0 ? cur.spend / cur.conversions : 0), ...calcDelta(prv.costPerConversion, cur.costPerConversion), color: 'default' as const },
  ];

  const campaigns = (raw.campaigns || []).map((c: any) => {
    const spend = c.costMicros / 1_000_000;
    return {
      campaign_name: c.name,
      campaign_type: c.channelType,
      metrics: {
        impressions: c.impressions,
        clicks: c.clicks,
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
    { label: 'CPL', value: cur.leads > 0 ? formatDollars(cur.spend / cur.leads) : 'N/A', ...calcDelta(prv.cpl, cur.cpl), color: 'default' as const },
    { label: 'Spend', value: formatDollars(cur.spend), ...calcDelta(cur.spend, prv.spend), color: 'default' as const },
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
    { label: 'Completed Revenue', value: formatDollars(cur.completedRevenue || 0), color: 'default' as const },
    { label: 'Total Sales', value: formatDollars(cur.totalSales || 0), color: 'default' as const },
    { label: 'Conversion Rate', value: formatPercent((cur.opportunityConversionRate || 0) * 100), color: 'default' as const },
    { label: 'Revenue / Lead', value: formatDollars(cur.revenuePerLead || 0), color: 'default' as const },
    { label: 'Avg Job Total', value: formatDollars(cur.totalJobAverage || 0), color: 'default' as const },
  ];

  const rawCampaigns = (raw.campaigns || []);

  const campaigns = rawCampaigns
    .sort((a: any, b: any) => (Number(b.completed_revenue) || 0) - (Number(a.completed_revenue) || 0))
    .map((c: any) => ({
      campaign: String(c.campaign_name || ''),
      jobs_booked: String(c.jobs_booked || 0),
      new_customers: String(c.jobs_booked_new || 0),
      existing_customers: String(c.jobs_booked_existing || 0),
      completed_revenue: fmt$(Number(c.completed_revenue) || 0),
      total_sales: fmt$(Number(c.total_sales) || 0),
    }));

  // Compute per-channel rollups for blending into source tabs
  const channelRollups = computeChannelRollups(
    rawCampaigns.map((c: any) => ({
      campaign_name: String(c.campaign_name || ''),
      jobs_booked: Number(c.jobs_booked) || 0,
      jobs_booked_new: Number(c.jobs_booked_new) || 0,
      jobs_booked_existing: Number(c.jobs_booked_existing) || 0,
      completed_revenue: Number(c.completed_revenue) || 0,
      total_sales: Number(c.total_sales) || 0,
    }))
  );

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
    channelRollups: Object.keys(channelRollups).length > 0 ? channelRollups : undefined,
  };
}

function transformLSA(raw: Record<string, any>): TransformResult {
  const cur = raw.current || {};
  const prv = raw.previous || {};

  const kpis = [
    { label: 'Leads', value: formatNumber(cur.leads || 0), ...calcDelta(cur.leads || 0, prv.leads || 0), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(cur.impressions || 0), ...calcDelta(cur.impressions || 0, prv.impressions || 0), color: 'default' as const },
    { label: 'Impression → Lead', value: formatPercent(cur.impressionToLeadRate || 0), ...calcDelta(cur.impressionToLeadRate || 0, prv.impressionToLeadRate || 0), color: 'default' as const },
    { label: 'Absolute Top Rate', value: formatPercent(cur.absoluteTopRate || 0), ...calcDelta(cur.absoluteTopRate || 0, prv.absoluteTopRate || 0), color: 'default' as const },
    { label: 'Spend', value: formatDollars(cur.spend || 0), ...calcDelta(cur.spend || 0, prv.spend || 0), color: 'default' as const },
  ];

  return { kpis, tables: {} };
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
  lsa: transformLSA,
};

export function transformRawData(source: SourceType, rawData: Record<string, any>): TransformResult | null {
  const fn = transformFunctions[source];
  if (!fn) return null;
  return fn(rawData);
}

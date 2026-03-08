import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, calcDelta } from '../data-pull-utils';

interface GA4Result {
  raw: Record<string, any>;
  kpis: any[];
  tables: Record<string, any>;
}

export async function pullGA4(
  credentials: Record<string, string>,
  periodStart: string
): Promise<GA4Result> {
  const { service_account_json, property_id } = credentials;
  const keyData = JSON.parse(service_account_json);

  const auth = new GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
  });

  const analyticsData = google.analyticsdata({ version: 'v1beta', auth });
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  // Main metrics report
  const metricsResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [
        { startDate, endDate },
        { startDate: prev.startDate, endDate: prev.endDate },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'newUsers' },
        // TODO: Re-enable conversions once meaningful conversion events are
        // consistently configured across all client GA4 properties. Without
        // that, the number can be misleading (often zero or tracking defaults).
        // { name: 'conversions' },
      ],
    },
  });

  const rows = metricsResponse.data.rows || [];
  const curMetrics = rows[0]?.metricValues?.map((v) => Number(v.value || 0)) || [0, 0];
  const prevMetrics = rows[1]?.metricValues?.map((v) => Number(v.value || 0)) || [0, 0];

  // Sessions by channel group — separate queries for current and previous period
  // (GA4 multi-date-range with dimensions duplicates rows per range rather than
  //  adding extra metric columns, making indexing unreliable)
  const ORGANIC_CHANNELS = ['Organic Search', 'Organic Social', 'Organic Video', 'Organic Shopping'];
  const PAID_CHANNELS = ['Paid Search', 'Paid Social', 'Paid Video', 'Paid Shopping', 'Display', 'Paid Other'];
  const DIRECT_CHANNELS = ['Direct'];

  function bucketChannelSessions(channelRows: any[]) {
    let organic = 0, direct = 0, paid = 0;
    for (const r of channelRows) {
      const channel = r.dimensionValues?.[0]?.value || '';
      const sessions = Number(r.metricValues?.[0]?.value || 0);
      if (ORGANIC_CHANNELS.includes(channel)) organic += sessions;
      else if (DIRECT_CHANNELS.includes(channel)) direct += sessions;
      else if (PAID_CHANNELS.includes(channel)) paid += sessions;
    }
    return { organic, direct, paid };
  }

  const curChannelResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
    },
  });

  const prevChannelResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [{ startDate: prev.startDate, endDate: prev.endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
    },
  });

  const curChannelRows = curChannelResponse.data.rows || [];
  const prevChannelRows = prevChannelResponse.data.rows || [];
  const curChannels = bucketChannelSessions(curChannelRows);
  const prevChannels = bucketChannelSessions(prevChannelRows);

  const kpis = [
    { label: 'New Users', value: formatNumber(curMetrics[1]), ...calcDelta(curMetrics[1], prevMetrics[1]), color: 'default' as const },
    { label: 'Sessions', value: formatNumber(curMetrics[0]), ...calcDelta(curMetrics[0], prevMetrics[0]), color: 'default' as const },
    { label: 'Organic Sessions', value: formatNumber(curChannels.organic), ...calcDelta(curChannels.organic, prevChannels.organic), color: 'default' as const },
    { label: 'Direct Sessions', value: formatNumber(curChannels.direct), ...calcDelta(curChannels.direct, prevChannels.direct), color: 'default' as const },
    { label: 'Paid Sessions', value: formatNumber(curChannels.paid), ...calcDelta(curChannels.paid, prevChannels.paid), color: 'default' as const },
  ];

  // Channel breakdown table (current period only)
  const channelBreakdownRows = curChannelRows
    .map((r: any) => ({
      channel: r.dimensionValues?.[0]?.value || '',
      sessions: r.metricValues?.[0]?.value || '0',
    }))
    .sort((a: any, b: any) => Number(b.sessions) - Number(a.sessions))
    .slice(0, 10);

  // Top landing pages
  const pagesResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    },
  });

  const pageRows = (pagesResponse.data.rows || []).map((r) => ({
    page: r.dimensionValues?.[0]?.value || '',
    sessions: r.metricValues?.[0]?.value || '0',
  }));

  return {
    raw: {
      current: {
        sessions: curMetrics[0],
        newUsers: curMetrics[1],
        organicSessions: curChannels.organic,
        directSessions: curChannels.direct,
        paidSessions: curChannels.paid,
        // TODO: Add conversions once GA4 conversion events are configured per client
        // conversions: ...,
      },
      previous: {
        sessions: prevMetrics[0],
        newUsers: prevMetrics[1],
        organicSessions: prevChannels.organic,
        directSessions: prevChannels.direct,
        paidSessions: prevChannels.paid,
      },
      channelBreakdown: channelBreakdownRows,
      topLandingPages: pageRows,
    },
    kpis,
    tables: {
      channelBreakdown: {
        title: 'Channel Breakdown',
        columns: [
          { key: 'channel', label: 'Channel', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
        ],
        rows: channelBreakdownRows,
      },
      topLandingPages: {
        title: 'Top Landing Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
        ],
        rows: pageRows,
      },
    },
  };
}

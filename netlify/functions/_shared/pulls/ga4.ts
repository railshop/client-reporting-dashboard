import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, calcDelta } from '../data-pull-utils';

interface GA4Result {
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
        { name: 'totalUsers' },
        { name: 'newUsers' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
        { name: 'conversions' },
      ],
    },
  });

  const rows = metricsResponse.data.rows || [];
  const current = rows[0]?.metricValues?.map((v) => Number(v.value || 0)) || [0, 0, 0, 0, 0, 0, 0];
  const previous = rows[1]?.metricValues?.map((v) => Number(v.value || 0)) || [0, 0, 0, 0, 0, 0, 0];

  const metricLabels = ['Sessions', 'Users', 'New Users', 'Pageviews', 'Avg Duration', 'Bounce Rate', 'Conversions'];
  const kpis = metricLabels.map((label, i) => {
    const { delta, direction } = calcDelta(current[i], previous[i]);
    let value: string;
    if (label === 'Avg Duration') {
      const mins = Math.floor(current[i] / 60);
      const secs = Math.round(current[i] % 60);
      value = `${mins}m ${secs}s`;
    } else if (label === 'Bounce Rate') {
      value = formatPercent(current[i] * 100);
    } else {
      value = formatNumber(current[i]);
    }
    return { label, value, delta, direction, color: 'default' as const };
  });

  // Channel breakdown
  const channelResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'conversions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    },
  });

  const channelRows = (channelResponse.data.rows || []).map((r) => ({
    channel: r.dimensionValues?.[0]?.value || '',
    sessions: r.metricValues?.[0]?.value || '0',
    users: r.metricValues?.[1]?.value || '0',
    conversions: r.metricValues?.[2]?.value || '0',
  }));

  // Top landing pages
  const pagesResponse = await analyticsData.properties.runReport({
    property: `properties/${property_id}`,
    requestBody: {
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'landingPagePlusQueryString' }],
      metrics: [
        { name: 'sessions' },
        { name: 'conversions' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    },
  });

  const pageRows = (pagesResponse.data.rows || []).map((r) => ({
    page: r.dimensionValues?.[0]?.value || '',
    sessions: r.metricValues?.[0]?.value || '0',
    conversions: r.metricValues?.[1]?.value || '0',
  }));

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
        rows: channelRows,
      },
      topLandingPages: {
        title: 'Top Landing Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'sessions', label: 'Sessions', align: 'right' },
          { key: 'conversions', label: 'Conversions', align: 'right' },
        ],
        rows: pageRows,
      },
    },
  };
}

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, calcDelta } from '../data-pull-utils';

interface GSCResult {
  kpis: any[];
  tables: Record<string, any>;
}

export async function pullGSC(
  credentials: Record<string, string>,
  periodStart: string
): Promise<GSCResult> {
  const { service_account_json, site_url } = credentials;
  const keyData = JSON.parse(service_account_json);

  const auth = new GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  // Current period totals
  const currentResponse = await searchconsole.searchanalytics.query({
    siteUrl: site_url,
    requestBody: { startDate, endDate, dimensions: [] },
  });

  // Previous period totals
  const prevResponse = await searchconsole.searchanalytics.query({
    siteUrl: site_url,
    requestBody: { startDate: prev.startDate, endDate: prev.endDate, dimensions: [] },
  });

  const cur = currentResponse.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const prv = prevResponse.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };

  const kpis = [
    { label: 'Clicks', value: formatNumber(cur.clicks || 0), ...calcDelta(cur.clicks || 0, prv.clicks || 0), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(cur.impressions || 0), ...calcDelta(cur.impressions || 0, prv.impressions || 0), color: 'default' as const },
    { label: 'CTR', value: formatPercent((cur.ctr || 0) * 100), ...calcDelta((cur.ctr || 0) * 100, (prv.ctr || 0) * 100), color: 'default' as const },
    { label: 'Avg Position', value: (cur.position || 0).toFixed(1), ...calcDelta(prv.position || 0, cur.position || 0), color: 'default' as const },
  ];

  // Top queries
  const queriesResponse = await searchconsole.searchanalytics.query({
    siteUrl: site_url,
    requestBody: {
      startDate, endDate,
      dimensions: ['query'],
      rowLimit: 15,
    },
  });

  const queryRows = (queriesResponse.data.rows || []).map((r) => ({
    query: r.keys?.[0] || '',
    clicks: String(r.clicks || 0),
    impressions: String(r.impressions || 0),
    ctr: formatPercent((r.ctr || 0) * 100),
    position: (r.position || 0).toFixed(1),
  }));

  // Top pages
  const pagesResponse = await searchconsole.searchanalytics.query({
    siteUrl: site_url,
    requestBody: {
      startDate, endDate,
      dimensions: ['page'],
      rowLimit: 10,
    },
  });

  const pageRows = (pagesResponse.data.rows || []).map((r) => ({
    page: (r.keys?.[0] || '').replace(site_url, ''),
    clicks: String(r.clicks || 0),
    impressions: String(r.impressions || 0),
    ctr: formatPercent((r.ctr || 0) * 100),
  }));

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
        rows: queryRows,
      },
      topPages: {
        title: 'Top Pages',
        columns: [
          { key: 'page', label: 'Page', align: 'left' },
          { key: 'clicks', label: 'Clicks', align: 'right' },
          { key: 'impressions', label: 'Impressions', align: 'right' },
          { key: 'ctr', label: 'CTR', align: 'right' },
        ],
        rows: pageRows,
      },
    },
  };
}

import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import { getDateRange, getPreviousDateRange, formatNumber, calcDelta } from '../data-pull-utils';

interface GBPResult {
  raw: Record<string, any>;
  kpis: any[];
  tables: Record<string, any>;
}

export async function pullGBP(
  credentials: Record<string, string>,
  periodStart: string
): Promise<GBPResult> {
  const { service_account_json, account_id, location_id } = credentials;
  const keyData = JSON.parse(service_account_json);
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  const auth = new GoogleAuth({
    credentials: keyData,
    scopes: ['https://www.googleapis.com/auth/business.manage'],
  });

  const authClient = await auth.getClient();

  // GBP Performance API — fetch metrics via REST
  const locationName = `locations/${location_id}`;

  async function fetchMetrics(start: string, end: string) {
    const url = `https://businessprofileperformance.googleapis.com/v1/${locationName}:fetchMultiDailyMetricsTimeSeries`;
    const res = await authClient.request({
      url,
      method: 'GET',
      params: {
        'dailyMetrics': [
          'BUSINESS_IMPRESSIONS_DESKTOP_MAPS',
          'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH',
          'BUSINESS_IMPRESSIONS_MOBILE_MAPS',
          'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
          'CALL_CLICKS',
          'WEBSITE_CLICKS',
          'BUSINESS_DIRECTION_REQUESTS',
        ],
        'dailyRange.startDate.year': Number(start.split('-')[0]),
        'dailyRange.startDate.month': Number(start.split('-')[1]),
        'dailyRange.startDate.day': Number(start.split('-')[2]),
        'dailyRange.endDate.year': Number(end.split('-')[0]),
        'dailyRange.endDate.month': Number(end.split('-')[1]),
        'dailyRange.endDate.day': Number(end.split('-')[2]),
      },
    });
    return res.data;
  }

  function sumMetric(data: any, metricName: string): number {
    const series = data?.multiDailyMetricTimeSeries?.find(
      (s: any) => s.dailyMetric === metricName
    );
    if (!series?.dailyMetricTimeSeries?.timeSeries?.datedValues) return 0;
    return series.dailyMetricTimeSeries.timeSeries.datedValues.reduce(
      (sum: number, dv: any) => sum + (Number(dv.value) || 0),
      0
    );
  }

  const currentData = await fetchMetrics(startDate, endDate);
  const prevData = await fetchMetrics(prev.startDate, prev.endDate);

  const mapsImpressions =
    sumMetric(currentData, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS') +
    sumMetric(currentData, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS');
  const searchImpressions =
    sumMetric(currentData, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') +
    sumMetric(currentData, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH');
  const totalImpressions = mapsImpressions + searchImpressions;
  const calls = sumMetric(currentData, 'CALL_CLICKS');
  const websiteClicks = sumMetric(currentData, 'WEBSITE_CLICKS');
  const directions = sumMetric(currentData, 'BUSINESS_DIRECTION_REQUESTS');

  const prevMaps =
    sumMetric(prevData, 'BUSINESS_IMPRESSIONS_DESKTOP_MAPS') +
    sumMetric(prevData, 'BUSINESS_IMPRESSIONS_MOBILE_MAPS');
  const prevSearch =
    sumMetric(prevData, 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH') +
    sumMetric(prevData, 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH');
  const prevTotal = prevMaps + prevSearch;
  const prevCalls = sumMetric(prevData, 'CALL_CLICKS');
  const prevWebsite = sumMetric(prevData, 'WEBSITE_CLICKS');
  const prevDirections = sumMetric(prevData, 'BUSINESS_DIRECTION_REQUESTS');

  const kpis = [
    { label: 'Total Views', value: formatNumber(totalImpressions), ...calcDelta(totalImpressions, prevTotal), color: 'default' as const },
    { label: 'Maps Views', value: formatNumber(mapsImpressions), ...calcDelta(mapsImpressions, prevMaps), color: 'default' as const },
    { label: 'Search Views', value: formatNumber(searchImpressions), ...calcDelta(searchImpressions, prevSearch), color: 'default' as const },
    { label: 'Phone Calls', value: formatNumber(calls), ...calcDelta(calls, prevCalls), color: 'default' as const },
    { label: 'Website Clicks', value: formatNumber(websiteClicks), ...calcDelta(websiteClicks, prevWebsite), color: 'default' as const },
    { label: 'Direction Requests', value: formatNumber(directions), ...calcDelta(directions, prevDirections), color: 'default' as const },
  ];

  return {
    raw: {
      current: {
        mapsImpressions,
        searchImpressions,
        totalImpressions,
        calls,
        websiteClicks,
        directions,
      },
      previous: {
        mapsImpressions: prevMaps,
        searchImpressions: prevSearch,
        totalImpressions: prevTotal,
        calls: prevCalls,
        websiteClicks: prevWebsite,
        directions: prevDirections,
      },
    },
    kpis,
    tables: {},
  };
}

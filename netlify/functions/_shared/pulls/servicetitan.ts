import { getDateRange, getPreviousDateRange, formatNumber, calcDelta } from '../data-pull-utils';
import type { SourceFilter } from '../../../../src/shared/schemas/filters';

const ST_BASE = 'https://api.servicetitan.io';

interface STResult {
  raw: Record<string, any>;
  kpis: any[];
  tables: Record<string, any>;
}

async function stFetch(path: string, apiKey: string, tenantId: string, accessToken: string) {
  const res = await fetch(`${ST_BASE}${path}`, {
    headers: {
      Authorization: accessToken,
      'ST-App-Key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`ServiceTitan API error: ${res.status}`);
  }
  return res.json();
}

async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${ST_BASE}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) throw new Error('Failed to get ServiceTitan access token');
  const data = await res.json();
  return data.access_token;
}

export async function pullServiceTitan(
  credentials: Record<string, string>,
  periodStart: string,
  filters?: SourceFilter[]
): Promise<STResult> {
  const { api_key, tenant_id, client_id, client_secret } = credentials;
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  const accessToken = await getAccessToken(client_id, client_secret);

  // Fetch jobs for current period
  const jobsData = await stFetch(
    `/jpm/v2/tenant/${tenant_id}/jobs?createdOnOrAfter=${startDate}&createdBefore=${endDate}&pageSize=1000`,
    api_key, tenant_id, accessToken
  );

  const prevJobsData = await stFetch(
    `/jpm/v2/tenant/${tenant_id}/jobs?createdOnOrAfter=${prev.startDate}&createdBefore=${prev.endDate}&pageSize=1000`,
    api_key, tenant_id, accessToken
  );

  let jobs = jobsData.data || [];
  let prevJobs = prevJobsData.data || [];

  // Filter by campaign IDs if filters are set
  const campaignFilterIds = filters
    ?.filter((f) => f.filter_type === 'campaign' && f.active)
    .map((f) => f.filter_value);
  if (campaignFilterIds && campaignFilterIds.length > 0) {
    jobs = jobs.filter((j: any) => campaignFilterIds.includes(String(j.campaignId || j.campaign?.id)));
    prevJobs = prevJobs.filter((j: any) => campaignFilterIds.includes(String(j.campaignId || j.campaign?.id)));
  }

  const totalJobs = jobs.length;
  const prevTotalJobs = prevJobs.length;
  const totalRevenue = jobs.reduce((sum: number, j: any) => sum + (j.totalAmount || 0), 0);
  const prevRevenue = prevJobs.reduce((sum: number, j: any) => sum + (j.totalAmount || 0), 0);
  const completedJobs = jobs.filter((j: any) => j.status === 'Completed').length;
  const prevCompleted = prevJobs.filter((j: any) => j.status === 'Completed').length;

  const kpis = [
    { label: 'Total Jobs', value: formatNumber(totalJobs), ...calcDelta(totalJobs, prevTotalJobs), color: 'default' as const },
    { label: 'Completed Jobs', value: formatNumber(completedJobs), ...calcDelta(completedJobs, prevCompleted), color: 'default' as const },
    { label: 'Revenue', value: '$' + totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 }), ...calcDelta(totalRevenue, prevRevenue), color: 'default' as const },
    { label: 'Avg Ticket', value: '$' + (totalJobs > 0 ? (totalRevenue / totalJobs).toFixed(2) : '0.00'), ...calcDelta(totalJobs > 0 ? totalRevenue / totalJobs : 0, prevTotalJobs > 0 ? prevRevenue / prevTotalJobs : 0), color: 'default' as const },
  ];

  // Job summary by type
  const typeMap: Record<string, { count: number; revenue: number }> = {};
  for (const j of jobs) {
    const type = j.type?.name || j.jobType || 'Other';
    if (!typeMap[type]) typeMap[type] = { count: 0, revenue: 0 };
    typeMap[type].count++;
    typeMap[type].revenue += j.totalAmount || 0;
  }

  const jobSummaryRows = Object.entries(typeMap)
    .sort(([, a], [, b]) => b.revenue - a.revenue)
    .map(([type, data]) => ({
      type,
      count: String(data.count),
      revenue: '$' + data.revenue.toLocaleString('en-US', { minimumFractionDigits: 2 }),
    }));

  return {
    raw: {
      current: {
        totalJobs,
        completedJobs,
        totalRevenue,
        avgTicket: totalJobs > 0 ? totalRevenue / totalJobs : 0,
      },
      previous: {
        totalJobs: prevTotalJobs,
        completedJobs: prevCompleted,
        totalRevenue: prevRevenue,
        avgTicket: prevTotalJobs > 0 ? prevRevenue / prevTotalJobs : 0,
      },
      jobsByType: Object.entries(typeMap).map(([type, data]) => ({
        type,
        count: data.count,
        revenue: data.revenue,
      })),
    },
    kpis,
    tables: {
      jobSummary: {
        title: 'Job Summary by Type',
        columns: [
          { key: 'type', label: 'Job Type', align: 'left' },
          { key: 'count', label: 'Count', align: 'right' },
          { key: 'revenue', label: 'Revenue', align: 'right' },
        ],
        rows: jobSummaryRows,
      },
    },
  };
}

import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, calcDelta } from '../data-pull-utils';

const META_API_VERSION = 'v21.0';
const META_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

interface MetaResult {
  kpis: any[];
  tables: Record<string, any>;
  campaigns: any[];
}

async function metaFetch(path: string, token: string) {
  const res = await fetch(`${META_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Meta API error: ${res.status}`);
  }
  return res.json();
}

export async function pullMeta(
  credentials: Record<string, string>,
  periodStart: string
): Promise<MetaResult> {
  const { access_token, ad_account_id } = credentials;
  const acctId = ad_account_id.startsWith('act_') ? ad_account_id : `act_${ad_account_id}`;
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  // Account-level insights for current period
  const currentInsights = await metaFetch(
    `/${acctId}/insights?fields=impressions,clicks,ctr,reach,frequency,spend,actions&time_range={"since":"${startDate}","until":"${endDate}"}`,
    access_token
  );

  // Previous period
  const prevInsights = await metaFetch(
    `/${acctId}/insights?fields=impressions,clicks,reach,spend,actions&time_range={"since":"${prev.startDate}","until":"${prev.endDate}"}`,
    access_token
  );

  const cur = currentInsights.data?.[0] || {};
  const prv = prevInsights.data?.[0] || {};

  const getAction = (data: any, type: string) => {
    const action = data.actions?.find((a: any) => a.action_type === type);
    return Number(action?.value || 0);
  };

  const curLeads = getAction(cur, 'lead') + getAction(cur, 'onsite_conversion.lead_grouped');
  const prevLeads = getAction(prv, 'lead') + getAction(prv, 'onsite_conversion.lead_grouped');
  const curSpend = Number(cur.spend || 0);
  const prevSpend = Number(prv.spend || 0);

  const kpis = [
    { label: 'Reach', value: formatNumber(Number(cur.reach || 0)), ...calcDelta(Number(cur.reach || 0), Number(prv.reach || 0)), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(Number(cur.impressions || 0)), ...calcDelta(Number(cur.impressions || 0), Number(prv.impressions || 0)), color: 'default' as const },
    { label: 'Clicks', value: formatNumber(Number(cur.clicks || 0)), ...calcDelta(Number(cur.clicks || 0), Number(prv.clicks || 0)), color: 'default' as const },
    { label: 'CTR', value: formatPercent(Number(cur.ctr || 0)), ...calcDelta(Number(cur.ctr || 0), Number(prv.ctr || 0)), color: 'default' as const },
    { label: 'Leads', value: formatNumber(curLeads), ...calcDelta(curLeads, prevLeads), color: 'default' as const },
    { label: 'CPL', value: curLeads > 0 ? '$' + (curSpend / curLeads).toFixed(2) : 'N/A', ...calcDelta(prevLeads > 0 ? prevSpend / prevLeads : 0, curLeads > 0 ? curSpend / curLeads : 0), color: 'default' as const },
    { label: 'Spend', value: '$' + curSpend.toFixed(2), ...calcDelta(curSpend, prevSpend), color: 'default' as const },
  ];

  // Campaign-level data
  const campaignInsights = await metaFetch(
    `/${acctId}/insights?fields=campaign_name,impressions,clicks,ctr,reach,frequency,spend,actions&level=campaign&time_range={"since":"${startDate}","until":"${endDate}"}&limit=50`,
    access_token
  );

  const campaigns = (campaignInsights.data || []).map((c: any) => {
    const leads = getAction(c, 'lead') + getAction(c, 'onsite_conversion.lead_grouped');
    const spend = Number(c.spend || 0);
    return {
      campaign_name: c.campaign_name,
      campaign_type: 'Meta',
      metrics: {
        reach: Number(c.reach || 0),
        frequency: Number(c.frequency || 0).toFixed(2),
        impressions: Number(c.impressions || 0),
        clicks: Number(c.clicks || 0),
        ctr: formatPercent(Number(c.ctr || 0)),
        leads,
        cpl: leads > 0 ? '$' + (spend / leads).toFixed(2) : 'N/A',
        spend: '$' + spend.toFixed(2),
      },
    };
  });

  return { kpis, tables: {}, campaigns };
}

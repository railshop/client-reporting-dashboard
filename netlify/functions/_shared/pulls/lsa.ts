import { GoogleAdsApi } from 'google-ads-api';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, formatDollars, calcDelta } from '../data-pull-utils';
import type { SourceFilter } from '../../../../src/shared/schemas/filters';

interface LSAResult {
  raw: Record<string, any>;
  kpis: any[];
  tables: Record<string, any>;
  campaigns: any[];
}

export async function pullLSA(
  credentials: Record<string, string>,
  periodStart: string,
  filters?: SourceFilter[]
): Promise<LSAResult> {
  const { client_id, client_secret, developer_token, refresh_token, customer_id, manager_account_id } = credentials;
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  const client = new GoogleAdsApi({
    client_id,
    client_secret,
    developer_token,
  });

  const customer = client.Customer({
    customer_id: customer_id.replace(/-/g, ''),
    login_customer_id: manager_account_id.replace(/-/g, ''),
    refresh_token,
  });

  // Build optional campaign filter from saved LSA filters
  const campaignFilterIds = filters
    ?.filter((f) => f.filter_type === 'campaign' && f.active)
    .map((f) => f.filter_value);
  const campaignFilterClause = campaignFilterIds && campaignFilterIds.length > 0
    ? `AND campaign.id IN (${campaignFilterIds.join(', ')})`
    : '';

  // Current period — LSA campaigns only
  const currentRows = await customer.query(`
    SELECT
      campaign.id,
      campaign.name,
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.absolute_top_impression_percentage
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'LOCAL_SERVICES'
      ${campaignFilterClause}
    ORDER BY metrics.cost_micros DESC
  `);

  // Aggregate current period
  let totalImpressions = 0, totalLeads = 0, totalCostMicros = 0;
  let weightedAbsTopRate = 0; // weighted by impressions
  const campaigns = currentRows.map((r: any) => {
    const imp = Number(r.metrics.impressions || 0);
    const conv = Number(r.metrics.conversions || 0);
    const costMicros = Number(r.metrics.cost_micros || 0);
    const absTop = Number(r.metrics.absolute_top_impression_percentage || 0);

    totalImpressions += imp;
    totalLeads += conv;
    totalCostMicros += costMicros;
    weightedAbsTopRate += absTop * imp;

    return {
      campaign_name: r.campaign.name,
      campaign_id: String(r.campaign.id),
      impressions: imp,
      leads: conv,
      spend: costMicros / 1_000_000,
      absoluteTopRate: absTop,
    };
  });

  const totalSpend = totalCostMicros / 1_000_000;
  const impressionToLeadRate = totalImpressions > 0 ? (totalLeads / totalImpressions) * 100 : 0;
  const absoluteTopRate = totalImpressions > 0 ? weightedAbsTopRate / totalImpressions : 0;

  // Previous period
  const prevRows = await customer.query(`
    SELECT
      metrics.impressions,
      metrics.conversions,
      metrics.cost_micros,
      metrics.absolute_top_impression_percentage
    FROM campaign
    WHERE segments.date BETWEEN '${prev.startDate}' AND '${prev.endDate}'
      AND campaign.status = 'ENABLED'
      AND campaign.advertising_channel_type = 'LOCAL_SERVICES'
      ${campaignFilterClause}
  `);

  let prevImpressions = 0, prevLeads = 0, prevCostMicros = 0, prevWeightedAbsTop = 0;
  for (const r of prevRows) {
    const imp = Number(r.metrics?.impressions || 0);
    prevImpressions += imp;
    prevLeads += Number(r.metrics?.conversions || 0);
    prevCostMicros += Number(r.metrics?.cost_micros || 0);
    prevWeightedAbsTop += Number(r.metrics?.absolute_top_impression_percentage || 0) * imp;
  }

  const prevSpend = prevCostMicros / 1_000_000;
  const prevImprToLead = prevImpressions > 0 ? (prevLeads / prevImpressions) * 100 : 0;
  const prevAbsTopRate = prevImpressions > 0 ? prevWeightedAbsTop / prevImpressions : 0;

  const current = {
    leads: totalLeads,
    impressions: totalImpressions,
    impressionToLeadRate,
    absoluteTopRate,
    spend: totalSpend,
  };

  const previous = {
    leads: prevLeads,
    impressions: prevImpressions,
    impressionToLeadRate: prevImprToLead,
    absoluteTopRate: prevAbsTopRate,
    spend: prevSpend,
  };

  const kpis = [
    { label: 'Leads', value: formatNumber(totalLeads), ...calcDelta(totalLeads, prevLeads), color: 'default' as const },
    { label: 'Impressions', value: formatNumber(totalImpressions), ...calcDelta(totalImpressions, prevImpressions), color: 'default' as const },
    { label: 'Impression → Lead', value: formatPercent(impressionToLeadRate), ...calcDelta(impressionToLeadRate, prevImprToLead), color: 'default' as const },
    { label: 'Absolute Top Rate', value: formatPercent(absoluteTopRate), ...calcDelta(absoluteTopRate, prevAbsTopRate), color: 'default' as const },
    { label: 'Spend', value: formatDollars(totalSpend), ...calcDelta(totalSpend, prevSpend), color: 'default' as const },
  ];

  return {
    raw: { current, previous, campaigns },
    kpis,
    tables: {},
    campaigns: [],
  };
}

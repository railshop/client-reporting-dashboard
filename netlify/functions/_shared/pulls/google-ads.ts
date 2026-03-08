import { GoogleAdsApi } from 'google-ads-api';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, formatDollars, calcDelta } from '../data-pull-utils';
import type { SourceFilter } from '../../../../src/shared/schemas/filters';

interface GoogleAdsResult {
  raw: Record<string, any>;
  kpis: any[];
  tables: Record<string, any>;
  campaigns: any[];
}

export async function pullGoogleAds(
  credentials: Record<string, string>,
  periodStart: string,
  filters?: SourceFilter[]
): Promise<GoogleAdsResult> {
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

  // Build campaign filter clause
  const campaignFilterIds = filters
    ?.filter((f) => f.filter_type === 'campaign' && f.active)
    .map((f) => f.filter_value);
  const campaignFilterClause = campaignFilterIds && campaignFilterIds.length > 0
    ? `AND campaign.id IN (${campaignFilterIds.join(', ')})`
    : '';

  // Campaign performance for current period
  const campaignRows = await customer.query(`
    SELECT
      campaign.name,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
      ${campaignFilterClause}
    ORDER BY metrics.cost_micros DESC
  `);

  // Aggregate totals for current period
  let totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalCostMicros = 0;
  const campaigns = campaignRows.map((r: any) => {
    const imp = Number(r.metrics.impressions || 0);
    const clicks = Number(r.metrics.clicks || 0);
    const conv = Number(r.metrics.conversions || 0);
    const costMicros = Number(r.metrics.cost_micros || 0);
    const spend = costMicros / 1_000_000;

    totalImpressions += imp;
    totalClicks += clicks;
    totalConversions += conv;
    totalCostMicros += costMicros;

    return {
      campaign_name: r.campaign.name,
      campaign_type: r.campaign.advertising_channel_type || 'UNKNOWN',
      metrics: {
        impressions: imp,
        clicks,
        conversions: conv,
        cost_per_conversion: '$' + (conv > 0 ? (spend / conv).toFixed(2) : '0.00'),
        spend: '$' + spend.toFixed(2),
      },
    };
  });

  // Previous period totals
  const prevRows = await customer.query(`
    SELECT
      metrics.impressions,
      metrics.clicks,
      metrics.conversions,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${prev.startDate}' AND '${prev.endDate}'
      AND campaign.status = 'ENABLED'
      ${campaignFilterClause}
  `);

  let prevImpressions = 0, prevClicks = 0, prevConversions = 0, prevCost = 0;
  for (const r of prevRows) {
    prevImpressions += Number(r.metrics?.impressions || 0);
    prevClicks += Number(r.metrics?.clicks || 0);
    prevConversions += Number(r.metrics?.conversions || 0);
    prevCost += Number(r.metrics?.cost_micros || 0);
  }

  const totalSpend = totalCostMicros / 1_000_000;

  const kpis = [
    { label: 'Impressions', value: formatNumber(totalImpressions), ...calcDelta(totalImpressions, prevImpressions), color: 'default' as const },
    { label: 'Clicks', value: formatNumber(totalClicks), ...calcDelta(totalClicks, prevClicks), color: 'default' as const },
    { label: 'Conversions', value: formatNumber(totalConversions), ...calcDelta(totalConversions, prevConversions), color: 'default' as const },
    { label: 'Spend', value: formatDollars(totalSpend), ...calcDelta(totalCostMicros, prevCost), color: 'default' as const },
    { label: 'Cost/Conv', value: formatDollars(totalConversions > 0 ? totalSpend / totalConversions : 0), ...calcDelta(prevConversions > 0 ? prevCost / prevConversions : 0, totalConversions > 0 ? totalCostMicros / totalConversions : 0), color: 'default' as const },
  ];

  return {
    raw: {
      current: {
        impressions: totalImpressions,
        clicks: totalClicks,
        conversions: totalConversions,
        costMicros: totalCostMicros,
        spend: totalSpend,
        costPerConversion: totalConversions > 0 ? totalSpend / totalConversions : 0,
      },
      previous: {
        impressions: prevImpressions,
        clicks: prevClicks,
        conversions: prevConversions,
        costMicros: prevCost,
        spend: prevCost / 1_000_000,
        costPerConversion: prevConversions > 0 ? (prevCost / 1_000_000) / prevConversions : 0,
      },
      campaigns: campaignRows.map((r: any) => ({
        name: r.campaign.name,
        channelType: r.campaign.advertising_channel_type || 'UNKNOWN',
        impressions: Number(r.metrics.impressions || 0),
        clicks: Number(r.metrics.clicks || 0),
        conversions: Number(r.metrics.conversions || 0),
        costMicros: Number(r.metrics.cost_micros || 0),
      })),
    },
    kpis,
    tables: {},
    campaigns,
  };
}

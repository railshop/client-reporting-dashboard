import { GoogleAdsApi } from 'google-ads-api';
import { getDateRange, getPreviousDateRange, formatNumber, formatPercent, calcDelta } from '../data-pull-utils';

interface GoogleAdsResult {
  kpis: any[];
  tables: Record<string, any>;
  campaigns: any[];
}

export async function pullGoogleAds(
  credentials: Record<string, string>,
  periodStart: string
): Promise<GoogleAdsResult> {
  const { developer_token, refresh_token, customer_id, manager_account_id } = credentials;
  const { startDate, endDate } = getDateRange(periodStart);
  const prev = getPreviousDateRange(periodStart);

  const client = new GoogleAdsApi({
    client_id: process.env.GOOGLE_ADS_CLIENT_ID || '',
    client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || '',
    developer_token,
  });

  const customer = client.Customer({
    customer_id: customer_id.replace(/-/g, ''),
    login_customer_id: manager_account_id.replace(/-/g, ''),
    refresh_token,
  });

  // Campaign performance for current period
  const campaignRows = await customer.query(`
    SELECT
      campaign.name,
      campaign.advertising_channel_type,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.average_cpc,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.cost_micros
    FROM campaign
    WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
      AND campaign.status = 'ENABLED'
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
        ctr: formatPercent(clicks > 0 ? (clicks / imp) * 100 : 0),
        cpc: '$' + (clicks > 0 ? (spend / clicks).toFixed(2) : '0.00'),
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
    { label: 'CTR', value: formatPercent(totalClicks > 0 ? (totalClicks / totalImpressions) * 100 : 0), ...calcDelta(totalClicks / Math.max(totalImpressions, 1), prevClicks / Math.max(prevImpressions, 1)), color: 'default' as const },
    { label: 'Conversions', value: formatNumber(totalConversions), ...calcDelta(totalConversions, prevConversions), color: 'default' as const },
    { label: 'Spend', value: '$' + totalSpend.toFixed(2), ...calcDelta(totalCostMicros, prevCost), color: 'default' as const },
    { label: 'Cost/Conv', value: '$' + (totalConversions > 0 ? (totalSpend / totalConversions).toFixed(2) : '0.00'), ...calcDelta(prevConversions > 0 ? prevCost / prevConversions : 0, totalConversions > 0 ? totalCostMicros / totalConversions : 0), color: 'default' as const },
  ];

  return { kpis, tables: {}, campaigns };
}

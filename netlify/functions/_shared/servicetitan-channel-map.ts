import { formatNumber, formatDollars } from './data-pull-utils';

type ChannelType = 'google_ads' | 'lsa' | 'ga4' | 'meta' | 'gbp';

/**
 * Maps a ServiceTitan campaign name to a source channel based on the
 * "RS - [Channel] - [details]" naming convention.
 */
export function mapCampaignToChannel(campaignName: string): ChannelType | null {
  const parts = campaignName.split(' - ');
  if (parts.length < 2 || parts[0].trim() !== 'RS') return null;

  const channel = parts[1].trim().toLowerCase();

  if (channel === 'google ads' || channel === 'ppc' || channel === 'sem') return 'google_ads';
  if (channel === 'lsa' || channel === 'local services') return 'lsa';
  if (channel === 'seo' || channel === 'website' || channel === 'organic') return 'ga4';
  if (channel === 'meta' || channel === 'facebook') return 'meta';
  if (channel === 'gbp' || channel === 'google business') return 'gbp';

  return null;
}

interface RawCampaign {
  campaign_name: string;
  jobs_booked: number;
  jobs_booked_new: number;
  jobs_booked_existing: number;
  completed_revenue: number;
  total_sales: number;
}

export interface ChannelRollup {
  kpis: Array<{ label: string; value: string; color: 'default' }>;
  campaigns: Array<{
    campaign: string;
    jobs_booked: string;
    new_customers: string;
    existing_customers: string;
    completed_revenue: string;
    total_sales: string;
  }>;
}

/**
 * Groups ServiceTitan campaigns by channel and computes rolled-up KPIs.
 * Operates on raw (unformatted) campaign data.
 */
export function computeChannelRollups(
  rawCampaigns: RawCampaign[]
): Record<string, ChannelRollup> {
  const groups: Record<string, RawCampaign[]> = {};

  for (const c of rawCampaigns) {
    const channel = mapCampaignToChannel(c.campaign_name);
    if (!channel) continue;
    if (!groups[channel]) groups[channel] = [];
    groups[channel].push(c);
  }

  const fmt$ = (v: number) =>
    '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2 });

  const rollups: Record<string, ChannelRollup> = {};

  for (const [channel, campaigns] of Object.entries(groups)) {
    const totalJobs = campaigns.reduce((s, c) => s + (c.jobs_booked || 0), 0);
    const totalNew = campaigns.reduce((s, c) => s + (c.jobs_booked_new || 0), 0);
    const totalExisting = campaigns.reduce((s, c) => s + (c.jobs_booked_existing || 0), 0);
    const totalRevenue = campaigns.reduce((s, c) => s + (c.completed_revenue || 0), 0);
    const totalSales = campaigns.reduce((s, c) => s + (c.total_sales || 0), 0);

    rollups[channel] = {
      kpis: [
        { label: 'Total Jobs', value: formatNumber(totalJobs), color: 'default' as const },
        { label: 'New Customers', value: formatNumber(totalNew), color: 'default' as const },
        { label: 'Existing Customers', value: formatNumber(totalExisting), color: 'default' as const },
        { label: 'Completed Revenue', value: formatDollars(totalRevenue), color: 'default' as const },
        { label: 'Total Sales', value: formatDollars(totalSales), color: 'default' as const },
      ],
      campaigns: campaigns
        .sort((a, b) => (b.completed_revenue || 0) - (a.completed_revenue || 0))
        .map((c) => ({
          campaign: c.campaign_name,
          jobs_booked: String(c.jobs_booked || 0),
          new_customers: String(c.jobs_booked_new || 0),
          existing_customers: String(c.jobs_booked_existing || 0),
          completed_revenue: fmt$(c.completed_revenue || 0),
          total_sales: fmt$(c.total_sales || 0),
        })),
    };
  }

  return rollups;
}

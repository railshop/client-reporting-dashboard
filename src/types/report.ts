import type { KpiItem, TableDef, Overview } from '@/shared/schemas/common';

export interface ReportClient {
  slug: string;
  name: string;
  logo_url: string | null;
}

export interface ReportPeriod {
  id: string;
  period_start: string;
  status: 'draft' | 'published';
  overview: Overview;
  railshop_notes: string | null;
  next_priorities: string[] | null;
  published_at: string | null;
}

export interface ServiceTitanBlended {
  kpis: KpiItem[];
  campaigns: Array<{
    campaign: string;
    jobs_booked: string;
    new_customers: string;
    existing_customers: string;
    completed_revenue: string;
    total_sales: string;
  }>;
}

export interface ReportSection {
  id: string;
  source: string;
  kpis: KpiItem[];
  tables: Record<string, TableDef>;
  railshop_notes: string | null;
  next_priorities: string[] | null;
  campaigns: ReportCampaign[];
  servicetitan_blended?: ServiceTitanBlended;
}

export interface ReportCampaign {
  id: string;
  campaign_name: string;
  campaign_type: string | null;
  metrics: Record<string, unknown>;
}

export interface ReportData {
  client: ReportClient;
  period: ReportPeriod;
  sections: ReportSection[];
}

export interface PeriodListItem {
  id: string;
  period_start: string;
  status: string;
  published_at: string | null;
}

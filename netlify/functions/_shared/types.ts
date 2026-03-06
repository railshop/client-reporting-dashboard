export interface JwtPayload {
  userId: string;
  role: 'admin' | 'client';
  clientId: string | null;
  clientSlug: string | null;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  client_id: string | null;
}

export interface ApiClient {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  active: boolean;
}

export interface ApiReportPeriod {
  id: string;
  client_id: string;
  period_start: string;
  status: 'draft' | 'published';
  overview: Record<string, unknown>;
  railshop_notes: string | null;
  next_priorities: string[] | null;
  published_at: string | null;
}

export interface ApiReportSection {
  id: string;
  report_period_id: string;
  source: string;
  kpis: unknown[];
  tables: Record<string, unknown>;
  railshop_notes: string | null;
  next_priorities: string[] | null;
}

export interface ApiCampaignMetric {
  id: string;
  report_section_id: string;
  campaign_name: string;
  campaign_type: string | null;
  metrics: Record<string, unknown>;
}

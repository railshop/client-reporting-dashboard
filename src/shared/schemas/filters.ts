import type { SourceType } from './credentials';

export interface SourceFilter {
  id: string;
  data_source_id: string;
  filter_type: string;
  filter_value: string;
  label: string | null;
  active: boolean;
}

export interface FilterOption {
  filter_type: string;
  filter_value: string;
  label: string;
}

// Which sources support campaign/entity filtering, and what filter types they use
export const FILTERABLE_SOURCES: Partial<Record<SourceType, { filterType: string; label: string }>> = {
  meta: { filterType: 'campaign', label: 'Campaigns' },
  google_ads: { filterType: 'campaign', label: 'Campaigns' },
};

export function isFilterableSource(source: SourceType): boolean {
  return source in FILTERABLE_SOURCES;
}

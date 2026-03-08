import { KpiGrid } from '../KpiGrid';
import { DataTable } from '../DataTable';
import { NotesCallout } from '../NotesCallout';
import { SectionHeader } from '../SectionHeader';
import type { KpiItem, TableDef } from '@/shared/schemas/common';
import { SOURCE_LABELS } from '@/shared/schemas/sources';
import type { ServiceTitanBlended } from '@/types/report';

interface SourceTabProps {
  source: string;
  sourceTag?: string;
  kpis: KpiItem[];
  tables: Record<string, TableDef>;
  railshopNotes?: string | null;
  servicetitanBlended?: ServiceTitanBlended;
}

const SOURCE_TAGS: Record<string, string> = {
  ga4: 'Google Analytics 4',
  gsc: 'Google Search Console',
  google_ads: 'Google Ads API',
  meta: 'Facebook & Instagram',
  lsa: 'Google Ads API',
  servicetitan: 'ServiceTitan',
  gbp: 'Google Business Profile',
};

const ST_CAMPAIGN_TABLE_COLUMNS = [
  { key: 'campaign', label: 'Campaign', align: 'left' as const },
  { key: 'jobs_booked', label: 'Jobs', align: 'right' as const },
  { key: 'new_customers', label: 'New', align: 'right' as const },
  { key: 'existing_customers', label: 'Existing', align: 'right' as const },
  { key: 'completed_revenue', label: 'Revenue', align: 'right' as const },
  { key: 'total_sales', label: 'Sales', align: 'right' as const },
];

export function SourceTab({ source, kpis, tables, railshopNotes, servicetitanBlended }: SourceTabProps) {
  const label = SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source;
  const tag = SOURCE_TAGS[source] || undefined;

  // Get all table entries
  const tableEntries = Object.values(tables).filter(Boolean) as TableDef[];

  // Split tables into pairs for two-column layout when we have 2+ tables
  const showTwoCol = tableEntries.length >= 2;

  return (
    <div>
      <div className="mb-7">
        <SectionHeader title={`${label} Performance`} tag={tag} />
        <KpiGrid kpis={kpis} />
      </div>

      {servicetitanBlended && (
        <div className="mb-7">
          <SectionHeader title="ServiceTitan Performance" tag="ServiceTitan" />
          <KpiGrid kpis={servicetitanBlended.kpis} />
          {servicetitanBlended.campaigns.length > 0 && (
            <DataTable
              table={{
                title: 'Campaign Performance',
                columns: ST_CAMPAIGN_TABLE_COLUMNS,
                rows: servicetitanBlended.campaigns,
              }}
            />
          )}
        </div>
      )}

      {showTwoCol ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tableEntries.map((table) => (
            <DataTable key={table.title} table={table} />
          ))}
        </div>
      ) : (
        tableEntries.map((table) => (
          <DataTable key={table.title} table={table} />
        ))
      )}

      {railshopNotes && (
        <NotesCallout title={`Railshop Notes — ${label}`} notes={railshopNotes} />
      )}
    </div>
  );
}

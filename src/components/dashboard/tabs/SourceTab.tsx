import { KpiGrid } from '../KpiGrid';
import { DataTable } from '../DataTable';
import { NotesCallout } from '../NotesCallout';
import { SectionHeader } from '../SectionHeader';
import type { KpiItem, TableDef } from '@/shared/schemas/common';
import { SOURCE_LABELS } from '@/shared/schemas/sources';

interface SourceTabProps {
  source: string;
  sourceTag?: string;
  kpis: KpiItem[];
  tables: Record<string, TableDef>;
  railshopNotes?: string | null;
}

const SOURCE_TAGS: Record<string, string> = {
  ga4: 'Google Analytics 4',
  gsc: 'Google Search Console',
  google_ads: 'Google Ads API',
  meta: 'Facebook & Instagram',
  lsa: 'LSA Dashboard',
  servicetitan: 'ServiceTitan',
  gbp: 'Google Business Profile',
};

export function SourceTab({ source, kpis, tables, railshopNotes }: SourceTabProps) {
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

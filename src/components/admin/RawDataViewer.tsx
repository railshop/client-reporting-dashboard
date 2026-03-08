import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

interface RawIngestion {
  id: string;
  source: string;
  raw_data: Record<string, any>;
  metadata: Record<string, any>;
  created_at: string;
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return val.toLocaleString('en-US');
    return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof val === 'string') return val;
  return JSON.stringify(val);
}

const thCls = 'px-3 py-2 text-left text-[11px] font-medium text-text-3 whitespace-nowrap';
const tdCls = 'px-3 py-1.5 text-[12px] text-text-v1 font-mono whitespace-nowrap';

function KeyValueTable({ data, title }: { data: Record<string, any>; title: string }) {
  const entries = Object.entries(data).filter(
    ([, v]) => (typeof v !== 'object' || v === null) && v !== 0 && v !== '' && v !== undefined
  );
  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] text-text-3 tracking-[0.05em] mb-2">{title}</div>
      <table className="text-sm border-collapse">
        <thead>
          <tr className="border-b border-border-v1">
            <th className={thCls}>Metric</th>
            <th className={thCls + ' text-right'}>Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className="border-b border-border-v1">
              <td className={tdCls}>{key}</td>
              <td className={tdCls + ' text-right'}>{formatValue(val)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Put name/label/identifier columns first, then the rest */
function sortColumns(columns: string[]): string[] {
  const nameKeys = ['campaign_name', 'name', 'campaign', 'type', 'label', 'query', 'page', 'channel'];
  const first: string[] = [];
  const rest: string[] = [];
  for (const col of columns) {
    if (nameKeys.includes(col.toLowerCase())) {
      first.push(col);
    } else {
      rest.push(col);
    }
  }
  return [...first, ...rest];
}

/**
 * Wide array table using CSS `contain: inline-size` to prevent
 * the table's intrinsic width from propagating up the DOM tree.
 * This is the key property — it tells the browser to size this
 * element from its parent context, never from its descendants.
 */
function ArrayTable({ data, title }: { data: any[]; title: string }) {
  if (!data.length) return null;
  const columns = sortColumns(Object.keys(data[0]));

  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] text-text-3 tracking-[0.05em] mb-2">{title}</div>
      <div
        className="overflow-x-auto rounded-md border border-border-v1"
        style={{ contain: 'inline-size' }}
      >
        <table className="text-sm border-collapse">
          <thead>
            <tr className="border-b border-border-v1 bg-surface-2">
              {columns.map((col) => (
                <th key={col} className={thCls}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, i) => (
              <tr key={i} className="border-b border-border-v1">
                {columns.map((col) => (
                  <td key={col} className={tdCls}>{formatValue(row[col])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length > 50 && (
        <div className="text-[10px] text-text-3 mt-1">
          Showing 50 of {data.length} rows
        </div>
      )}
    </div>
  );
}

/** Skip empty objects (e.g. empty "previous" with all zeros) */
function isEmptySection(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return value.length === 0;
  const entries = Object.entries(value as Record<string, unknown>).filter(
    ([, v]) => v !== 0 && v !== '' && v !== null && v !== undefined
  );
  return entries.length === 0;
}

function SourceRawData({ rawData }: { rawData: Record<string, any> }) {
  const sections: React.ReactNode[] = [];

  for (const [key, value] of Object.entries(rawData)) {
    if (isEmptySection(value)) continue;
    if (Array.isArray(value)) {
      sections.push(<ArrayTable key={key} data={value} title={key} />);
    } else if (typeof value === 'object' && value !== null) {
      sections.push(<KeyValueTable key={key} data={value} title={key} />);
    }
  }

  if (sections.length === 0) {
    return <KeyValueTable data={rawData} title="Data" />;
  }

  return <>{sections}</>;
}

export function RawDataViewer({ ingestions }: { ingestions: RawIngestion[] }) {
  if (ingestions.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        No raw data ingested yet. Click "Pull Data" to ingest from APIs.
      </div>
    );
  }

  return (
    <Tabs defaultValue={0}>
      <TabsList variant="line" className="flex-wrap">
        {ingestions.map((ing, i) => (
          <TabsTrigger key={ing.source} value={i} className="text-[11px] px-3">
            {SOURCE_LABELS[ing.source as SourceType] || ing.source}
            <Badge variant="secondary" className="ml-1.5 text-[9px] px-1.5 py-0 h-4">
              {new Date(ing.created_at).toLocaleDateString()}
            </Badge>
          </TabsTrigger>
        ))}
      </TabsList>

      {ingestions.map((ing, i) => (
        <TabsContent key={ing.source} value={i} className="pt-3">
          <SourceRawData rawData={ing.raw_data} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

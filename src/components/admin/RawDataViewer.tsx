import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
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

function KeyValueTable({ data, title }: { data: Record<string, any>; title: string }) {
  const entries = Object.entries(data).filter(
    ([, v]) => typeof v !== 'object' || v === null
  );
  if (entries.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] text-text-3 tracking-[0.05em] mb-2">{title}</div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-[11px]">Metric</TableHead>
            <TableHead className="text-[11px] text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([key, val]) => (
            <TableRow key={key}>
              <TableCell className="text-[12px] text-text-v1">{key}</TableCell>
              <TableCell className="text-[12px] text-text-v1 text-right font-mono">
                {formatValue(val)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ArrayTable({ data, title }: { data: any[]; title: string }) {
  if (!data.length) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="mb-4">
      <div className="font-mono text-[10px] text-text-3 tracking-[0.05em] mb-2">{title}</div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col} className="text-[11px]">{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.slice(0, 50).map((row, i) => (
              <TableRow key={i}>
                {columns.map((col) => (
                  <TableCell key={col} className="text-[12px] text-text-v1 font-mono">
                    {formatValue(row[col])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SourceRawData({ rawData }: { rawData: Record<string, any> }) {
  const sections: JSX.Element[] = [];

  for (const [key, value] of Object.entries(rawData)) {
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

import { useState, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { CSV_SOURCE_MAPPINGS, type CsvColumnDef } from '@/shared/schemas/csv-mappings';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[12px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';

function parseCsvText(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === ',') {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function autoMatchColumns(
  csvHeaders: string[],
  targetColumns: CsvColumnDef[]
): Record<string, string> {
  const map: Record<string, string> = {};
  const usedFields = new Set<string>();

  for (const header of csvHeaders) {
    const lower = header.toLowerCase().replace(/[^a-z0-9]/g, '');
    let bestMatch: CsvColumnDef | null = null;

    for (const col of targetColumns) {
      if (usedFields.has(col.field)) continue;
      const colLower = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      const fieldLower = col.field.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (lower === colLower || lower === fieldLower || lower.includes(colLower) || colLower.includes(lower)) {
        bestMatch = col;
        break;
      }
    }

    if (bestMatch) {
      map[header] = bestMatch.field;
      usedFields.add(bestMatch.field);
    }
  }

  return map;
}

// Source types that have CSV mappings defined
const CSV_SOURCES = Object.keys(CSV_SOURCE_MAPPINGS) as SourceType[];

export function CsvUploadPanel({
  clientSlug,
  periodStart,
  onUploaded,
}: {
  clientSlug: string;
  periodStart: string;
  onUploaded: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<SourceType | ''>('');
  const [csvText, setCsvText] = useState('');
  const [filename, setFilename] = useState('');
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState<'select' | 'map' | 'preview'>('select');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedSource('');
    setCsvText('');
    setFilename('');
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMap({});
    setStep('select');
    setUploading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setCsvText(text);
      const { headers, rows } = parseCsvText(text);
      setCsvHeaders(headers);
      setCsvRows(rows);

      if (selectedSource) {
        const mapping = CSV_SOURCE_MAPPINGS[selectedSource];
        if (mapping) {
          setColumnMap(autoMatchColumns(headers, mapping.columns));
        }
      }
      setStep('map');
    };
    reader.readAsText(file);
  };

  const handleSourceSelect = (source: SourceType) => {
    setSelectedSource(source);
    if (csvHeaders.length > 0) {
      const mapping = CSV_SOURCE_MAPPINGS[source];
      if (mapping) {
        setColumnMap(autoMatchColumns(csvHeaders, mapping.columns));
        setStep('map');
      }
    }
  };

  const updateMapping = (csvHeader: string, targetField: string) => {
    setColumnMap((prev) => {
      const next = { ...prev };
      if (targetField === '') {
        delete next[csvHeader];
      } else {
        next[csvHeader] = targetField;
      }
      return next;
    });
  };

  const handleUpload = async () => {
    if (!selectedSource || !csvText) return;
    setUploading(true);
    try {
      await apiFetch('/data-ingest-csv', {
        method: 'POST',
        body: JSON.stringify({
          clientSlug,
          periodStart,
          source: selectedSource,
          csvText,
          columnMap,
          filename,
        }),
      });
      setDialogOpen(false);
      reset();
      onUploaded();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sourceMapping = selectedSource ? CSV_SOURCE_MAPPINGS[selectedSource] : null;
  const mappedFieldCount = Object.keys(columnMap).length;
  const requiredFields = sourceMapping?.columns.filter((c) => c.required) || [];
  const mappedFields = new Set(Object.values(columnMap));
  const missingRequired = requiredFields.filter((c) => !mappedFields.has(c.field));

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => { reset(); setDialogOpen(true); }}
      >
        Upload CSV
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) reset();
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import CSV Data</DialogTitle>
            <DialogDescription>
              Upload a CSV file to ingest data for a source that doesn't have an API connection.
            </DialogDescription>
          </DialogHeader>

          {/* Step 1: Select source + file */}
          {step === 'select' && (
            <div className="space-y-4">
              <div>
                <label className="block font-mono text-[10px] text-text-3 mb-1.5 tracking-[0.05em]">
                  SOURCE
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CSV_SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSourceSelect(s)}
                      className={`text-left rounded-lg border px-3 py-2 text-[12px] transition-colors ${
                        selectedSource === s
                          ? 'border-blue bg-blue/10 text-text-v1'
                          : 'border-border-v1 bg-surface-2 text-text-3 hover:border-text-3'
                      }`}
                    >
                      <div className="font-semibold">{SOURCE_LABELS[s]}</div>
                      <div className="text-[10px] mt-0.5 opacity-70">
                        {CSV_SOURCE_MAPPINGS[s]?.mode === 'summary' ? 'Summary metrics' : 'Detail rows'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSource && (
                <div>
                  <label className="block font-mono text-[10px] text-text-3 mb-1.5 tracking-[0.05em]">
                    CSV FILE
                  </label>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    {sourceMapping?.description}
                  </p>
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-border-v1 rounded-lg px-6 py-8 text-center cursor-pointer hover:border-blue/50 transition-colors"
                  >
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <div className="text-[12px] text-text-3">
                      {filename ? (
                        <>
                          <span className="text-text-v1 font-semibold">{filename}</span>
                          <br />
                          <span className="text-[10px]">{csvRows.length} rows detected</span>
                        </>
                      ) : (
                        'Click to select a CSV file or drag and drop'
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Column mapping */}
          {step === 'map' && sourceMapping && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-text-v1">
                  <span className="font-semibold">{SOURCE_LABELS[selectedSource as SourceType]}</span>
                  {' '}&middot;{' '}
                  <span className="text-text-3">{filename}</span>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {csvRows.length} rows
                </Badge>
              </div>

              <div>
                <div className="font-mono text-[10px] text-text-3 tracking-[0.05em] mb-2">
                  COLUMN MAPPING
                </div>
                <div className="space-y-1.5">
                  {csvHeaders.map((header) => (
                    <div key={header} className="flex items-center gap-3">
                      <div className="text-[11px] text-text-v1 font-mono w-1/3 truncate" title={header}>
                        {header}
                      </div>
                      <span className="text-text-3 text-[10px]">&rarr;</span>
                      <select
                        value={columnMap[header] || ''}
                        onChange={(e) => updateMapping(header, e.target.value)}
                        className={INPUT_CLS + ' w-1/2'}
                      >
                        <option value="">— skip —</option>
                        {sourceMapping.columns.map((col) => (
                          <option key={col.field} value={col.field}>
                            {col.label} {col.required ? '*' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {missingRequired.length > 0 && (
                <div className="text-[11px] text-red">
                  Missing required: {missingRequired.map((c) => c.label).join(', ')}
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setStep('select')}>
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={() => setStep('preview')}
                  disabled={mappedFieldCount === 0 || missingRequired.length > 0}
                >
                  Preview Data
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && sourceMapping && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-[12px] text-text-v1 font-semibold">
                  Preview — {SOURCE_LABELS[selectedSource as SourceType]}
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {mappedFieldCount} columns mapped
                </Badge>
              </div>

              <div className="overflow-x-auto max-h-64 border border-border-v1 rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {csvHeaders
                        .filter((h) => columnMap[h])
                        .map((h) => {
                          const col = sourceMapping.columns.find((c) => c.field === columnMap[h]);
                          return (
                            <TableHead key={h} className="text-[10px] whitespace-nowrap">
                              {col?.label || h}
                            </TableHead>
                          );
                        })}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {csvRows.slice(0, 20).map((row, ri) => (
                      <TableRow key={ri}>
                        {csvHeaders
                          .filter((h) => columnMap[h])
                          .map((h, ci) => {
                            const idx = csvHeaders.indexOf(h);
                            return (
                              <TableCell key={ci} className="text-[11px] font-mono whitespace-nowrap">
                                {row[idx] || ''}
                              </TableCell>
                            );
                          })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {csvRows.length > 20 && (
                <div className="text-[10px] text-text-3 text-center">
                  Showing 20 of {csvRows.length} rows
                </div>
              )}

              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => setStep('map')}>
                  Back
                </Button>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); reset(); }}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading...' : `Import ${csvRows.length} rows`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

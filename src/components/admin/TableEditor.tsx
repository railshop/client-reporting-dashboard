import { useRef } from 'react';
import type { TableDef, ColumnDef } from '@/shared/schemas/common';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-2 py-1 text-[11px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';
const LABEL_CLS = 'block font-mono text-[9px] text-text-3 mb-1 tracking-[0.05em]';

interface TableEditorProps {
  table: TableDef;
  onChange: (table: TableDef) => void;
}

function parseCSV(text: string): string[][] {
  const lines = text.trim().split('\n');
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

export function TableEditor({ table, onChange }: TableEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const updateTitle = (title: string) => onChange({ ...table, title });

  const updateCell = (rowIndex: number, colKey: string, value: string) => {
    const rows = [...table.rows];
    rows[rowIndex] = { ...rows[rowIndex], [colKey]: value };
    onChange({ ...table, rows });
  };

  const addRow = () => {
    const empty: Record<string, string> = {};
    table.columns.forEach((c) => (empty[c.key] = ''));
    onChange({ ...table, rows: [...table.rows, empty] });
  };

  const removeRow = (index: number) => {
    onChange({ ...table, rows: table.rows.filter((_, i) => i !== index) });
  };

  const addColumn = () => {
    const key = `col_${table.columns.length}`;
    const col: ColumnDef = { key, label: '', align: 'left' };
    const rows = table.rows.map((r) => ({ ...r, [key]: '' }));
    onChange({ ...table, columns: [...table.columns, col], rows });
  };

  const updateColumnLabel = (index: number, label: string) => {
    const cols = [...table.columns];
    cols[index] = { ...cols[index], label };
    onChange({ ...table, columns: cols });
  };

  const removeColumn = (index: number) => {
    const key = table.columns[index].key;
    const cols = table.columns.filter((_, i) => i !== index);
    const rows = table.rows.map((r) => {
      const { [key]: _, ...rest } = r;
      return rest;
    });
    onChange({ ...table, columns: cols, rows });
  };

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length < 2) return;

      const headers = parsed[0];
      const columns: ColumnDef[] = headers.map((h, i) => ({
        key: `col_${i}`,
        label: h,
        align: i === 0 ? 'left' as const : 'right' as const,
      }));
      const rows = parsed.slice(1).map((row) => {
        const obj: Record<string, string> = {};
        columns.forEach((col, i) => {
          obj[col.key] = row[i] ?? '';
        });
        return obj;
      });

      onChange({ ...table, columns, rows });
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] px-4 py-3 mb-3">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <label className={LABEL_CLS}>TABLE TITLE</label>
          <input value={table.title} onChange={(e) => updateTitle(e.target.value)} className={INPUT_CLS + ' max-w-[300px]'} />
        </div>
        <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="font-mono text-[9px] text-text-3 hover:text-blue transition-colors mt-3"
        >
          CSV UPLOAD
        </button>
        <button type="button" onClick={addColumn} className="font-mono text-[9px] text-text-3 hover:text-blue transition-colors mt-3">
          + COL
        </button>
        <button type="button" onClick={addRow} className="font-mono text-[9px] text-text-3 hover:text-blue transition-colors mt-3">
          + ROW
        </button>
      </div>

      {table.columns.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr>
                {table.columns.map((col, ci) => (
                  <th key={col.key} className="pb-1 pr-2">
                    <div className="flex items-center gap-1">
                      <input
                        value={col.label}
                        onChange={(e) => updateColumnLabel(ci, e.target.value)}
                        className={INPUT_CLS + ' font-semibold'}
                        placeholder="Header"
                      />
                      {table.columns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeColumn(ci)}
                          className="text-text-3 hover:text-red text-[9px] shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="w-6" />
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  {table.columns.map((col) => (
                    <td key={col.key} className="pr-2 py-0.5">
                      <input
                        value={String(row[col.key] ?? '')}
                        onChange={(e) => updateCell(ri, col.key, e.target.value)}
                        className={INPUT_CLS}
                      />
                    </td>
                  ))}
                  <td className="py-0.5">
                    <button
                      type="button"
                      onClick={() => removeRow(ri)}
                      className="text-text-3 hover:text-red text-[9px]"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

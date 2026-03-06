import { cn } from '@/lib/utils';
import type { TableDef } from '@/shared/schemas/common';

interface DataTableProps {
  table: TableDef;
}

export function DataTable({ table }: DataTableProps) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-[10px] mb-4">
        <span className="text-[15px] font-bold text-text-v1 tracking-[-0.01em]">{table.title}</span>
      </div>
      <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden overflow-x-auto">
        <table className="w-full border-collapse min-w-[400px]">
          <thead>
            <tr className="border-b border-border-v1">
              {table.columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-[11px] font-mono text-[9px] text-text-3 uppercase tracking-[0.1em] font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left'
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border-v1 last:border-b-0 hover:bg-surface-2/50 transition-colors">
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-[13px]',
                      col.align === 'right'
                        ? 'text-right font-mono text-[12px] text-text-3'
                        : 'text-text-v1 font-medium'
                    )}
                  >
                    {String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {table.footerRow && (
              <tr className="border-t border-border-2 bg-surface-2/30">
                {table.columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3 text-[13px] font-semibold',
                      col.align === 'right' ? 'text-right font-mono text-[12px]' : ''
                    )}
                  >
                    {String(table.footerRow![col.key] ?? '')}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

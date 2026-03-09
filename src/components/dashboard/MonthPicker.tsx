import { useMemo } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { formatPeriod } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';

interface MonthPickerProps {
  periods: { id: string; period_start: string; status: string }[];
  current: string; // YYYY-MM
  onSelect: (period: string) => void;
  loading?: boolean;
}

export function MonthPicker({ periods, current, onSelect, loading }: MonthPickerProps) {
  // Group periods by year, most recent first
  const groupedByYear = useMemo(() => {
    const groups: Record<string, typeof periods> = {};
    for (const p of periods) {
      const year = p.period_start.slice(0, 4);
      if (!groups[year]) groups[year] = [];
      groups[year].push(p);
    }
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [periods]);

  const currentLabel = formatPeriod(current + '-01');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 font-mono text-[11px] text-text-2 bg-surface border border-border-v1 rounded-lg px-3 py-2 hover:border-border-2 hover:text-text-1 transition-colors cursor-pointer outline-none tracking-[0.04em]">
        {loading ? (
          <Loader2 className="size-3.5 text-blue animate-spin" />
        ) : (
          <Calendar className="size-3.5 text-text-3" />
        )}
        {currentLabel}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="min-w-[140px]">
        {groupedByYear.map(([year, yearPeriods]) => (
          <DropdownMenuSub key={year}>
            <DropdownMenuSubTrigger>{year}</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {yearPeriods.map((p) => {
                const slug = p.period_start.slice(0, 7);
                return (
                  <DropdownMenuItem
                    key={p.id}
                    className={slug === current ? 'text-blue font-medium' : ''}
                    onClick={() => onSelect(slug)}
                  >
                    {formatPeriod(p.period_start)}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

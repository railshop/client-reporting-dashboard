import { cn, formatPeriod } from '@/lib/utils';

interface MonthPickerProps {
  periods: { id: string; period_start: string; status: string }[];
  current: string; // YYYY-MM
  onSelect: (period: string) => void;
}

export function MonthPicker({ periods, current, onSelect }: MonthPickerProps) {
  if (periods.length <= 1) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {periods.map((p) => {
        const slug = p.period_start.slice(0, 7);
        const isActive = slug === current;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(slug)}
            className={cn(
              'font-mono text-[10px] px-3 py-1.5 rounded-full border transition-all',
              isActive
                ? 'bg-blue/10 border-blue-border text-blue'
                : 'bg-surface border-border-v1 text-text-3 hover:text-text-2 hover:border-border-2'
            )}
          >
            {formatPeriod(p.period_start)}
          </button>
        );
      })}
    </div>
  );
}

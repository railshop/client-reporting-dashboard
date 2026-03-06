import { cn } from '@/lib/utils';
import { DeltaChip } from './DeltaChip';
import type { KpiItem } from '@/shared/schemas/common';

interface KpiCardProps {
  kpi: KpiItem;
  index?: number;
}

export function KpiCard({ kpi, index = 0 }: KpiCardProps) {
  const colorClass =
    kpi.color === 'blue' ? 'text-blue' :
    kpi.color === 'green' ? 'text-v1-green' :
    kpi.color === 'gold' ? 'text-v1-gold' :
    'text-text-v1';

  return (
    <div
      className="bg-surface border border-border-v1 rounded-[11px] px-[18px] pt-5 pb-4 transition-all hover:border-border-2 hover:-translate-y-px"
      style={{
        animation: `fadeup 0.3s ease both`,
        animationDelay: `${index * 0.04}s`,
      }}
    >
      <div className="font-mono text-[9px] font-medium text-text-3 uppercase tracking-[0.1em] mb-[10px]">
        {kpi.label}
      </div>
      <div className={cn('text-[30px] font-extrabold leading-none tracking-[-0.03em]', colorClass)}>
        {kpi.value}
      </div>
      {kpi.delta && (
        <div className="flex items-center gap-1.5 mt-[10px]">
          <DeltaChip delta={kpi.delta} direction={kpi.direction} />
        </div>
      )}
    </div>
  );
}

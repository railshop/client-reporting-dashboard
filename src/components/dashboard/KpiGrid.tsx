import { KpiCard } from './KpiCard';
import type { KpiItem } from '@/shared/schemas/common';

interface KpiGridProps {
  kpis: KpiItem[];
}

export function KpiGrid({ kpis }: KpiGridProps) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(155px,1fr))] gap-[10px] mb-5">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.label} kpi={kpi} index={i} />
      ))}
    </div>
  );
}

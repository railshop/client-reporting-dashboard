import { cn } from '@/lib/utils';
import type { KpiItem } from '@/shared/schemas/common';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[12px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';
const LABEL_CLS = 'block font-mono text-[9px] text-text-3 mb-1 tracking-[0.05em]';

interface KpiEditorProps {
  kpis: KpiItem[];
  onChange: (kpis: KpiItem[]) => void;
}

function emptyKpi(): KpiItem {
  return { label: '', value: '', delta: '', direction: 'neutral', color: 'default' };
}

export function KpiEditor({ kpis, onChange }: KpiEditorProps) {
  const updateKpi = (index: number, field: keyof KpiItem, value: string) => {
    const updated = [...kpis];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const addKpi = () => onChange([...kpis, emptyKpi()]);

  const removeKpi = (index: number) => onChange(kpis.filter((_, i) => i !== index));

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-mono text-[10px] text-text-3 tracking-[0.05em]">KPIs</div>
        <button
          type="button"
          onClick={addKpi}
          className="font-mono text-[9px] text-blue hover:text-blue-dim transition-colors"
        >
          + ADD KPI
        </button>
      </div>
      <div className="space-y-2">
        {kpis.map((kpi, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_80px_80px_70px_auto] gap-2 items-end">
            <div>
              <label className={LABEL_CLS}>LABEL</label>
              <input value={kpi.label} onChange={(e) => updateKpi(i, 'label', e.target.value)} className={INPUT_CLS} placeholder="e.g. Sessions" />
            </div>
            <div>
              <label className={LABEL_CLS}>VALUE</label>
              <input value={kpi.value} onChange={(e) => updateKpi(i, 'value', e.target.value)} className={INPUT_CLS} placeholder="1,234" />
            </div>
            <div>
              <label className={LABEL_CLS}>DELTA</label>
              <input value={kpi.delta} onChange={(e) => updateKpi(i, 'delta', e.target.value)} className={INPUT_CLS} placeholder="+12%" />
            </div>
            <div>
              <label className={LABEL_CLS}>DIR</label>
              <select
                value={kpi.direction}
                onChange={(e) => updateKpi(i, 'direction', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="up">Up</option>
                <option value="down">Down</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <div>
              <label className={LABEL_CLS}>COLOR</label>
              <select
                value={kpi.color || 'default'}
                onChange={(e) => updateKpi(i, 'color', e.target.value)}
                className={INPUT_CLS}
              >
                <option value="default">Default</option>
                <option value="blue">Blue</option>
                <option value="green">Green</option>
                <option value="gold">Gold</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => removeKpi(i)}
              className={cn('font-mono text-[10px] text-text-3 hover:text-red transition-colors pb-1.5', kpis.length <= 1 && 'invisible')}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

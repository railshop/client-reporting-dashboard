import { cn } from '@/lib/utils';
import { formatPeriod } from '@/lib/utils';
import { DeltaChip } from './DeltaChip';
import type { KpiItem } from '@/shared/schemas/common';

interface HeroBandProps {
  periodStart: string;
  headline?: string;
  summary?: string;
  heroStats?: KpiItem[];
  onExport?: () => void;
}

export function HeroBand({ periodStart, headline, summary, heroStats, onExport }: HeroBandProps) {
  return (
    <div className="bg-surface border border-border-v1 rounded-[14px] p-7 mb-6 relative overflow-hidden">
      {/* Subtle blue gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(56,182,255,0.07)_0%,transparent_70%)]" />

      <div className="relative">
        <div className="flex items-start justify-between gap-5 flex-wrap mb-6">
          <div>
            <div className="font-mono text-[10px] font-medium text-blue uppercase tracking-[0.1em] mb-2">
              Monthly Performance Report &middot; {formatPeriod(periodStart)}
            </div>
            {headline && (
              <div
                className="text-[clamp(22px,4vw,30px)] font-bold leading-[1.2] text-text-v1 tracking-[-0.02em] [&_em]:text-blue [&_em]:not-italic"
                dangerouslySetInnerHTML={{ __html: headline }}
              />
            )}
            {summary && (
              <p className="text-[13.5px] text-text-2 mt-[10px] leading-[1.65] max-w-[500px] font-normal">
                {summary}
              </p>
            )}
          </div>
          {onExport && (
            <button
              onClick={onExport}
              className="bg-blue text-bg border-none cursor-pointer px-[18px] py-[10px] rounded-lg font-sans text-[12px] font-bold flex items-center gap-[7px] hover:opacity-85 transition-opacity whitespace-nowrap flex-shrink-0 tracking-[0.01em]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export PDF
            </button>
          )}
        </div>

        {heroStats && heroStats.length > 0 && (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-px bg-border-v1 rounded-[10px] overflow-hidden">
            {heroStats.map((stat) => {
              const colorClass =
                stat.color === 'blue' ? 'text-blue' :
                stat.color === 'green' ? 'text-v1-green' :
                stat.color === 'gold' ? 'text-v1-gold' :
                'text-text-v1';

              return (
                <div key={stat.label} className="bg-surface-2 px-[18px] py-4">
                  <div className="font-mono text-[9px] font-medium text-text-3 uppercase tracking-[0.1em] mb-2">
                    {stat.label}
                  </div>
                  <div className={cn('text-[26px] font-extrabold leading-none tracking-[-0.03em]', colorClass)}>
                    {stat.value}
                  </div>
                  {stat.delta && (
                    <div className="mt-[10px]">
                      <DeltaChip delta={stat.delta} direction={stat.direction} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

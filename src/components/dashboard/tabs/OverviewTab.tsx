import { HeroBand } from '../HeroBand';
import { PlatformCard } from '../PlatformCard';
import { PrioritySteps } from '../PrioritySteps';
import { SectionHeader } from '../SectionHeader';
import type { Overview } from '@/shared/schemas/common';

interface OverviewTabProps {
  periodStart: string;
  overview: Overview;
  priorities?: string[] | null;
  onExport?: () => void;
}

export function OverviewTab({ periodStart, overview, priorities, onExport }: OverviewTabProps) {
  return (
    <div>
      <HeroBand
        periodStart={periodStart}
        headline={overview.headline}
        summary={overview.summary}
        heroStats={overview.hero_stats}
        onExport={onExport}
      />

      {overview.platform_cards && overview.platform_cards.length > 0 && (
        <div className="mb-7">
          <SectionHeader title="Platform Breakdown" tag="All Channels" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[10px]">
            {overview.platform_cards.map((card) => (
              <PlatformCard key={card.platform} {...card} />
            ))}
          </div>
        </div>
      )}

      {priorities && priorities.length > 0 && (
        <PrioritySteps priorities={priorities} />
      )}
    </div>
  );
}

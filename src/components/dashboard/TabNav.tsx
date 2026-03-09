import { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface TabNavProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
  leftSlot?: React.ReactNode;
}

export function TabNav({ tabs, activeTab, onTabChange, leftSlot }: TabNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, tabs]);

  return (
    <div className="nav-wrap print:hidden bg-surface border-b border-border-v1">
      <div className="max-w-[1200px] mx-auto px-6 flex items-center gap-1">
        {leftSlot && (
          <div className="flex-shrink-0 pr-4 py-2">
            {leftSlot}
          </div>
        )}
        <div className="relative min-w-0 flex-1">
          <div
            ref={scrollRef}
            className="flex overflow-x-auto overflow-y-hidden scrollbar-none"
          >
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={cn(
                  'px-5 py-[14px] border-none bg-transparent cursor-pointer font-sans text-[13px] font-medium border-b-2 border-transparent transition-all whitespace-nowrap -mb-px',
                  activeTab === tab.key
                    ? 'text-blue border-b-blue'
                    : 'text-text-3 hover:text-text-2'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Fade hint — right edge gradient when more tabs overflow */}
          <div
            className={cn(
              'pointer-events-none absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-surface to-transparent transition-opacity duration-200',
              canScrollRight ? 'opacity-100' : 'opacity-0'
            )}
          />
        </div>
      </div>
    </div>
  );
}

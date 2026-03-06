import { cn } from '@/lib/utils';

interface TabNavProps {
  tabs: { key: string; label: string }[];
  activeTab: string;
  onTabChange: (key: string) => void;
}

export function TabNav({ tabs, activeTab, onTabChange }: TabNavProps) {
  return (
    <div className="nav-wrap print:hidden bg-surface border-b border-border-v1 overflow-x-auto scrollbar-none">
      <div className="max-w-[1200px] mx-auto px-6 flex w-max min-w-full">
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
    </div>
  );
}

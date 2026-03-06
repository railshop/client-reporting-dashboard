import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReport } from '@/hooks/useReport';
import { Topbar } from '@/components/dashboard/Topbar';
import { TabNav } from '@/components/dashboard/TabNav';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { OverviewTab } from '@/components/dashboard/tabs/OverviewTab';
import { SourceTab } from '@/components/dashboard/tabs/SourceTab';
import { SOURCE_LABELS } from '@/shared/schemas/sources';

const TAB_ORDER: string[] = ['overview', 'ga4', 'gsc', 'lsa', 'google_ads', 'meta', 'servicetitan', 'gbp'];

export function DashboardPage() {
  const { clientSlug, period } = useParams();
  const navigate = useNavigate();
  const { report, periods, loading, error } = useReport(clientSlug, period);
  const [activeTab, setActiveTab] = useState('overview');

  // Build dynamic tabs from available sections
  const tabs = useMemo(() => {
    if (!report) return [];
    const available = new Set(report.sections.map((s) => s.source));
    const dynamicTabs = [{ key: 'overview', label: 'Overview' }];

    for (const key of TAB_ORDER) {
      if (key === 'overview') continue;
      if (available.has(key)) {
        dynamicTabs.push({
          key,
          label: SOURCE_LABELS[key as keyof typeof SOURCE_LABELS] || key,
        });
      }
    }
    return dynamicTabs;
  }, [report]);

  const handlePeriodSelect = (p: string) => {
    setActiveTab('overview');
    navigate(`/${clientSlug}/${p}`);
  };

  const handleExport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-3 font-mono text-sm animate-pulse">Loading report...</div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center">
          <p className="text-v1-red font-mono text-sm mb-2">{error || 'Report not found'}</p>
          <p className="text-text-3 text-sm">
            No report data available for this client/period.
          </p>
        </div>
      </div>
    );
  }

  const currentPeriod = report.period.period_start.slice(0, 7);

  return (
    <div className="min-h-screen bg-bg">
      <Topbar
        clientName={report.client.name}
        periodStart={report.period.period_start}
        status={report.period.status}
      />
      <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="max-w-[1200px] mx-auto px-6 pt-7 pb-20">
        {/* Month picker */}
        {periods.length > 1 && (
          <div className="mb-6">
            <MonthPicker
              periods={periods}
              current={currentPeriod}
              onSelect={handlePeriodSelect}
            />
          </div>
        )}

        {/* Tab content */}
        {activeTab === 'overview' && (
          <OverviewTab
            periodStart={report.period.period_start}
            overview={report.period.overview}
            priorities={report.period.next_priorities}
            onExport={handleExport}
          />
        )}

        {activeTab !== 'overview' && (() => {
          const section = report.sections.find((s) => s.source === activeTab);
          if (!section) return <p className="text-text-3 text-sm">No data for this tab.</p>;
          return (
            <SourceTab
              source={section.source}
              kpis={section.kpis}
              tables={section.tables}
              railshopNotes={section.railshop_notes}
            />
          );
        })()}
      </div>
    </div>
  );
}

import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReport } from '@/hooks/useReport';
import { Topbar } from '@/components/dashboard/Topbar';
import { TabNav } from '@/components/dashboard/TabNav';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { ReportSkeleton } from '@/components/dashboard/ReportSkeleton';
import { OverviewTab } from '@/components/dashboard/tabs/OverviewTab';
import { SourceTab } from '@/components/dashboard/tabs/SourceTab';
import { SOURCE_LABELS } from '@/shared/schemas/sources';
import { cn } from '@/lib/utils';

const TAB_ORDER: string[] = ['overview', 'ga4', 'gsc', 'lsa', 'google_ads', 'meta', 'servicetitan', 'gbp'];

export function DashboardPage() {
  const { clientSlug, period } = useParams();
  const navigate = useNavigate();
  const { report, periods, loading, switching, error } = useReport(clientSlug, period);
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

  // Fall back to overview if active tab doesn't exist in the new report
  useEffect(() => {
    if (tabs.length > 0 && !tabs.some((t) => t.key === activeTab)) {
      setActiveTab('overview');
    }
  }, [tabs, activeTab]);

  const handlePeriodSelect = (p: string) => {
    navigate(`/${clientSlug}/${p}`);
  };

  const handleExport = () => {
    window.print();
  };

  const clientName = report?.client.name || clientSlug || '';

  if (loading && !report) {
    return (
      <div className="min-h-screen bg-bg">
        <Topbar clientName={clientName} />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 58px)' }}>
          <div className="text-text-3 font-mono text-sm animate-pulse">Loading report...</div>
        </div>
      </div>
    );
  }

  if (error && !report) {
    return (
      <div className="min-h-screen bg-bg">
        <Topbar clientName={clientName} />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 58px)' }}>
          <div className="text-center">
            <p className="text-red font-mono text-sm mb-2">{error || 'Report not found'}</p>
            <p className="text-text-3 text-sm">
              No report data available for this client/period.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const currentPeriod = report.period.period_start.slice(0, 7);

  const monthPicker = periods.length > 1 ? (
    <MonthPicker
      periods={periods}
      current={currentPeriod}
      onSelect={handlePeriodSelect}
      loading={switching}
    />
  ) : undefined;

  return (
    <div className="min-h-screen bg-bg">
      <Topbar clientName={report.client.name} />
      <TabNav
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        leftSlot={monthPicker}
      />

      <div className="max-w-[1200px] mx-auto px-6 pt-7 pb-20">
        {switching ? (
          <ReportSkeleton />
        ) : (
          <>
            {/* Overview tab — always rendered, hidden when inactive (but visible in print) */}
            <div className={cn(activeTab !== 'overview' && 'hidden print:block')}>
              <OverviewTab
                periodStart={report.period.period_start}
                overview={report.period.overview}
                priorities={report.period.next_priorities}
                onExport={handleExport}
              />
            </div>

            {/* Source tabs — all rendered, each hidden when inactive (but visible in print) */}
            {report.sections.map((section) => (
              <div
                key={section.source}
                className={cn(
                  'print-section',
                  activeTab !== section.source && 'hidden print:block'
                )}
              >
                <SourceTab
                  source={section.source}
                  kpis={section.kpis}
                  tables={section.tables}
                  railshopNotes={section.railshop_notes}
                  servicetitanBlended={section.servicetitan_blended}
                />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

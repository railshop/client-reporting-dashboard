import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useReport } from '@/hooks/useReport';
import { Topbar } from '@/components/dashboard/Topbar';
import { TabNav } from '@/components/dashboard/TabNav';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { OverviewTab } from '@/components/dashboard/tabs/OverviewTab';
import { SourceTab } from '@/components/dashboard/tabs/SourceTab';
import { SOURCE_LABELS } from '@/shared/schemas/sources';
import { cn } from '@/lib/utils';

function MinimalTopbar() {
  const { logout, user } = useAuth();
  return (
    <div className="sticky top-0 z-[100] bg-bg border-b border-border-v1">
      <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
        <img src="/railshop.svg" alt="Railshop" className="h-5 brightness-0 invert" />
        <div className="ml-auto flex items-center gap-4">
          {user?.role === 'admin' && (
            <Link to="/admin" className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]">
              ← ADMIN
            </Link>
          )}
          <button
            onClick={logout}
            className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <div className="min-h-screen bg-bg">
        <MinimalTopbar />
        <div className="flex items-center justify-center" style={{ minHeight: 'calc(100vh - 58px)' }}>
          <div className="text-text-3 font-mono text-sm animate-pulse">Loading report...</div>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-bg">
        <MinimalTopbar />
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
          <div className="mb-6 print:hidden">
            <MonthPicker
              periods={periods}
              current={currentPeriod}
              onSelect={handlePeriodSelect}
            />
          </div>
        )}

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
            />
          </div>
        ))}
      </div>
    </div>
  );
}

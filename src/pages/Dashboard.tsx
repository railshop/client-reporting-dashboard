import { useParams } from 'react-router-dom';

export function DashboardPage() {
  const { clientSlug, period } = useParams();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1200px] mx-auto px-6 py-7">
        <p className="text-text-3 font-mono text-xs">
          Dashboard: {clientSlug} {period ? `/ ${period}` : '(latest)'}
        </p>
        <p className="text-text-3 text-sm mt-2">
          Dashboard components will be built in Phase 2.
        </p>
      </div>
    </div>
  );
}

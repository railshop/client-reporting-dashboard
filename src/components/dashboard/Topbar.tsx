import { useAuth } from '@/hooks/useAuth';
import { formatPeriod } from '@/lib/utils';

interface TopbarProps {
  clientName: string;
  periodStart: string;
  status: 'draft' | 'published';
}

export function Topbar({ clientName, periodStart, status }: TopbarProps) {
  const { logout, user } = useAuth();

  return (
    <div className="topbar print:hidden sticky top-0 z-[100] bg-bg border-b border-border-v1">
      <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
        <img src="/railshop.svg" alt="Railshop" className="h-5 brightness-0 invert" />
        <div className="w-px h-5 bg-border-2 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-text-2 tracking-[0.01em]">
          {clientName}
        </span>
        <div className="flex items-center gap-[10px] ml-auto">
          <span className="font-mono text-[10px] text-text-3 bg-surface-2 border border-border-v1 rounded-full px-[13px] py-[5px] tracking-[0.06em] whitespace-nowrap">
            {formatPeriod(periodStart)}
          </span>
          {status === 'published' && (
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-blue tracking-[0.05em] whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-blue animate-[blink_2.4s_ease-in-out_infinite]" />
              LIVE
            </span>
          )}
          {user?.role === 'admin' && (
            <button
              onClick={() => window.history.back()}
              className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors ml-2"
            >
              BACK
            </button>
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

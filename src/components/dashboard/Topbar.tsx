import { useAuth } from '@/hooks/useAuth';

interface TopbarProps {
  clientName: string;
}

export function Topbar({ clientName }: TopbarProps) {
  const { logout, user } = useAuth();

  return (
    <div className="topbar print:hidden sticky top-0 z-[100] bg-bg border-b border-border-v1">
      <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
        <img src="/railshop.svg" alt="Railshop" className="h-5 brightness-0 invert" />
        <div className="w-px h-5 bg-border-2 flex-shrink-0" />
        <span className="text-[13px] font-semibold text-text-2 tracking-[0.01em]">
          {clientName}
        </span>
        <div className="flex items-center gap-3 ml-auto">
          {user && (
            <span className="font-mono text-[10px] text-text-3 tracking-[0.05em]">
              {user.name || user.email}
            </span>
          )}
          <button
            onClick={logout}
            className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';
import { formatPeriod } from '@/lib/utils';

interface ClientStatus {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  last_period_start: string | null;
  last_period_status: 'draft' | 'published' | null;
  last_published_at: string | null;
}

export function AdminHomePage() {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<ClientStatus[]>([]);

  useEffect(() => {
    apiFetch<{ clients: ClientStatus[] }>('/clients-list')
      .then((d) => setClients(d.clients))
      .catch(() => {
        setClients([
          { id: '1', slug: 'country-farms', name: 'Country Farms', active: true, last_period_start: null, last_period_status: null, last_published_at: null },
          { id: '2', slug: 'fire-and-ice', name: 'Fire & Ice', active: true, last_period_start: null, last_period_status: null, last_published_at: null },
          { id: '3', slug: 'jp-operations', name: 'JP Operations', active: true, last_period_start: null, last_period_status: null, last_published_at: null },
          { id: '4', slug: 'cedar-creek', name: 'Cedar Creek', active: true, last_period_start: null, last_period_status: null, last_published_at: null },
        ]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      {/* Topbar */}
      <div className="sticky top-0 z-[100] bg-bg border-b border-border-v1">
        <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
          <img src="/railshop.svg" alt="Railshop" className="h-5 brightness-0 invert" />
          <div className="w-px h-5 bg-border-2 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-text-2">Admin</span>
          <div className="ml-auto flex items-center gap-4">
            <Link
              to="/admin/users"
              className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]"
            >
              USERS
            </Link>
            <span className="font-mono text-[10px] text-text-3">{user?.email}</span>
            <button
              onClick={logout}
              className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors"
            >
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-7">
        <h1 className="text-xl font-bold text-text-2 mb-6">Client Dashboards</h1>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
          {clients.map((c) => (
            <Link
              key={c.slug}
              to={`/${c.slug}`}
              className="bg-surface border border-border-v1 rounded-[11px] px-5 py-4 hover:border-border-2 hover:-translate-y-px transition-all no-underline group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="text-[14px] font-semibold text-text-v1">{c.name}</div>
                {c.last_period_status === 'published' && (
                  <span className="flex items-center gap-1 font-mono text-[9px] text-blue tracking-[0.05em] shrink-0 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue animate-[blink_2.4s_ease-in-out_infinite]" />
                    LIVE
                  </span>
                )}
                {c.last_period_status === 'draft' && (
                  <span className="font-mono text-[9px] text-text-3 tracking-[0.05em] shrink-0 mt-0.5">
                    DRAFT
                  </span>
                )}
              </div>
              <div className="font-mono text-[10px] text-text-3">
                {c.last_period_start
                  ? formatPeriod(c.last_period_start)
                  : 'No reports yet'}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

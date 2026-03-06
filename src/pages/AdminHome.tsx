import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiFetch } from '@/lib/api';

interface ClientItem {
  slug: string;
  name: string;
  active: boolean;
}

export function AdminHomePage() {
  const { user, logout } = useAuth();
  const [clients, setClients] = useState<ClientItem[]>([]);

  useEffect(() => {
    apiFetch<{ clients: ClientItem[] }>('/clients-list')
      .then((d) => setClients(d.clients))
      .catch(() => {
        // Fallback: hardcoded from seed data until clients-list endpoint exists
        setClients([
          { slug: 'country-farms', name: 'Country Farms', active: true },
          { slug: 'fire-and-ice', name: 'Fire & Ice', active: true },
          { slug: 'jp-operations', name: 'JP Operations', active: true },
          { slug: 'cedar-creek', name: 'Cedar Creek', active: true },
        ]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-bg">
      <div className="sticky top-0 z-[100] bg-bg border-b border-border-v1">
        <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
          <span className="text-blue font-bold text-lg tracking-tight">RS</span>
          <div className="w-px h-5 bg-border-2 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-text-2">Admin</span>
          <div className="ml-auto flex items-center gap-3">
            <span className="font-mono text-[10px] text-text-3">{user?.email}</span>
            <button onClick={logout} className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors">
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
              className="bg-surface border border-border-v1 rounded-[11px] px-5 py-4 hover:border-border-2 hover:-translate-y-px transition-all no-underline"
            >
              <div className="text-[14px] font-semibold text-text-v1 mb-1">{c.name}</div>
              <div className="font-mono text-[10px] text-text-3">/{c.slug}</div>
            </Link>
          ))}
        </div>
        <p className="text-text-3 text-xs mt-6">
          Full admin management (user CRUD, report publishing) will be built in Phase 3.
        </p>
      </div>
    </div>
  );
}

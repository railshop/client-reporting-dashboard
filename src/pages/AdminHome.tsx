import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';

interface ClientStatus {
  id: string;
  slug: string;
  name: string;
  active: boolean;
}

export function AdminHomePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ clients: ClientStatus[] }>('/clients-list')
      .then((d) => {
        // Auto-navigate to first client if available
        if (d.clients.length > 0) {
          navigate(`/admin/clients/${d.clients[0].slug}/profile`, { replace: true });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>;
  }

  return (
    <>
      <AdminBreadcrumb items={[{ label: 'Admin' }]} />
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Select a client from the sidebar to get started.</p>
        </div>
      </div>
    </>
  );
}

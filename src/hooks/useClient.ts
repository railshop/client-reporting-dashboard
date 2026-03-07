import { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '@/lib/api';

interface ClientSource {
  id: string;
  source: string;
  active: boolean;
  has_credentials: boolean;
  identifiers: Record<string, string>;
  created_at: string;
}

interface ClientDetail {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  active: boolean;
  created_at: string;
}

interface ClientData {
  client: ClientDetail;
  sources: ClientSource[];
}

export function useClient(clientSlug: string | undefined) {
  const [data, setData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchClient = useCallback(async () => {
    if (!clientSlug) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<ClientData>(`/client-get?client=${clientSlug}`);
      setData(result);
    } catch (e: any) {
      setError(e.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  }, [clientSlug]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return { data, loading, error, refetch: fetchClient };
}

export type { ClientDetail, ClientSource, ClientData };

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import type { ReportData, PeriodListItem } from '@/types/report';

export function useReport(clientSlug: string | undefined, period?: string) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [periods, setPeriods] = useState<PeriodListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);
  const prevPeriod = useRef(period);

  // Detect period change synchronously during render — no useEffect delay
  if (hasFetched.current && period !== prevPeriod.current) {
    prevPeriod.current = period;
    setSwitching(true);
  }

  const fetchReport = useCallback(async () => {
    if (!clientSlug) return;
    if (!hasFetched.current) {
      setLoading(true);
    }
    setError(null);
    try {
      const params = new URLSearchParams({ client: clientSlug });
      if (period) params.set('period', period);
      const data = await apiFetch<ReportData>(`/report-get?${params}`);
      setReport(data);
      hasFetched.current = true;
    } catch (e: any) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  }, [clientSlug, period]);

  const fetchPeriods = useCallback(async () => {
    if (!clientSlug) return;
    try {
      const data = await apiFetch<{ periods: PeriodListItem[] }>(
        `/report-periods?client=${clientSlug}`
      );
      setPeriods(data.periods);
    } catch {
      // Non-critical, don't block
    }
  }, [clientSlug]);

  useEffect(() => {
    fetchReport();
    fetchPeriods();
  }, [fetchReport, fetchPeriods]);

  return { report, periods, loading, switching, error, refetch: fetchReport };
}

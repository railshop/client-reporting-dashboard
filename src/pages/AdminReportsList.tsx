import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiFetch } from '@/lib/api';
import { formatPeriod, periodToSlug } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';

interface PeriodRow {
  id: string;
  period_start: string;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
}

export function AdminReportsListPage() {
  const { clientSlug } = useParams();
  const [periods, setPeriods] = useState<PeriodRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [newMonth, setNewMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const fetchPeriods = () => {
    setLoading(true);
    apiFetch<{ periods: PeriodRow[] }>(`/report-periods?client=${clientSlug}`)
      .then((d) => setPeriods(d.periods))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPeriods();
  }, [clientSlug]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await apiFetch('/report-create', {
        method: 'POST',
        body: JSON.stringify({ clientSlug, periodStart: `${newMonth}-01` }),
      });
      fetchPeriods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create report');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Delete the report for ${label}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await apiFetch('/report-delete', {
        method: 'DELETE',
        body: JSON.stringify({ reportPeriodId: id }),
      });
      fetchPeriods();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete report');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      <AdminBreadcrumb items={[
        { label: clientSlug ?? '', href: `/admin/clients/${clientSlug}/profile` },
        { label: 'Reports' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-2">Reports</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={newMonth}
            onChange={(e) => setNewMonth(e.target.value)}
            className="bg-surface-2 border border-border-v1 rounded-lg px-3 py-1.5 text-[12px] text-text-v1 focus:outline-none focus:border-blue"
          />
          <Button onClick={handleCreate} disabled={creating}>
            {creating ? 'Creating...' : '+ Add Report'}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>
      ) : periods.length === 0 ? (
        <div className="bg-surface border border-border-v1 rounded-[11px] px-5 py-8 text-center text-muted-foreground text-sm">
          No reports yet. Create one above.
        </div>
      ) : (
        <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden">
          {periods.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                'flex items-center gap-4 px-5 py-3.5',
                i < periods.length - 1 && 'border-b border-border-v1'
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground">
                  {formatPeriod(p.period_start)}
                </div>
              </div>
              {p.status === 'published' ? (
                <span className="flex items-center gap-1.5 text-xs text-primary shrink-0">
                  <span className="size-1.5 rounded-full bg-primary animate-[blink_2.4s_ease-in-out_infinite]" />
                  Published
                </span>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">
                  Draft
                </span>
              )}
              <Link
                to={`/admin/clients/${clientSlug}/reports/${periodToSlug(p.period_start)}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                Edit
              </Link>
              <Link
                to={`/${clientSlug}/${periodToSlug(p.period_start)}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                View
              </Link>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(p.id, formatPeriod(p.period_start))}
                disabled={deleting === p.id}
              >
                {deleting === p.id ? '...' : 'Delete'}
              </Button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

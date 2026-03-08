import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useClient } from '@/hooks/useClient';
import { apiFetch } from '@/lib/api';
import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { CREDENTIAL_FIELDS } from '@/shared/schemas/credentials';
import { FILTERABLE_SOURCES, isFilterableSource, type SourceFilter, type FilterOption } from '@/shared/schemas/filters';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-2 text-[13px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';
const ALL_SOURCES: SourceType[] = ['ga4', 'gsc', 'google_ads', 'meta', 'lsa', 'servicetitan', 'gbp'];

// ── Source Credential Dialog ──

function SourceCredentialDialog({
  clientSlug,
  source,
  open,
  onOpenChange,
  onSaved,
  existingIdentifiers,
  hasCredentials,
}: {
  clientSlug: string;
  source: SourceType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  existingIdentifiers?: Record<string, string>;
  hasCredentials?: boolean;
}) {
  const fields = CREDENTIAL_FIELDS[source];
  const fieldEntries = Object.entries(fields);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Reset form values when dialog opens
  useEffect(() => {
    if (open) {
      setValues(
        Object.fromEntries(
          fieldEntries.map(([k, def]) => [
            k,
            // Pre-fill non-secret fields from existing identifiers
            !def.secret && existingIdentifiers?.[k] ? existingIdentifiers[k] : '',
          ])
        )
      );
      setError('');
    }
  }, [open]);

  if (fieldEntries.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure {SOURCE_LABELS[source]}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            No credentials needed — this source uses manual entry only.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // Only send fields that have values — blank secrets mean "keep existing"
      const credentials: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val) credentials[key] = val;
      }
      await apiFetch('/client-sources-update', {
        method: 'PUT',
        body: JSON.stringify({ clientSlug, source, credentials }),
      });
      onSaved();
      onOpenChange(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {SOURCE_LABELS[source]}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4">
          {fieldEntries.map(([key, def]) => {
            const isSavedSecret = def.secret && hasCredentials && !values[key];
            return (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{def.label}</Label>
                  {isSavedSecret && (
                    <span className="text-[10px] font-mono text-v1-green tracking-wide">SAVED</span>
                  )}
                </div>
                {def.multiline ? (
                  <textarea
                    value={values[key]}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    rows={4}
                    className={INPUT_CLS + ' resize-y font-mono text-[11px]'}
                    placeholder={isSavedSecret ? 'Leave blank to keep existing value' : 'Paste value...'}
                  />
                ) : (
                  <Input
                    type={def.secret ? 'password' : 'text'}
                    value={values[key]}
                    onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                    placeholder={isSavedSecret ? 'Leave blank to keep existing value' : def.secret ? '••••••••' : ''}
                  />
                )}
              </div>
            );
          })}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Credentials'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Source Filter Dialog ──

function SourceFilterDialog({
  clientSlug,
  source,
  dataSourceId,
  open,
  onOpenChange,
}: {
  clientSlug: string;
  source: SourceType;
  dataSourceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const filterConfig = FILTERABLE_SOURCES[source];
  const [loading, setLoading] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // Track which filter_values are selected (active)
  const [selections, setSelections] = useState<Record<string, { active: boolean; label: string }>>({});

  // Load existing filters on open
  useEffect(() => {
    if (!open || !dataSourceId) return;
    setLoading(true);
    setError('');
    apiFetch<{ filters: SourceFilter[] }>(`/source-filters-list?dataSourceId=${dataSourceId}`)
      .then((res) => {
        const sel: Record<string, { active: boolean; label: string }> = {};
        for (const f of res.filters) {
          sel[f.filter_value] = { active: f.active, label: f.label || f.filter_value };
        }
        setSelections(sel);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, dataSourceId]);

  const handleDiscover = async () => {
    setDiscovering(true);
    setError('');
    try {
      const res = await apiFetch<{ dataSourceId: string; options: FilterOption[] }>(
        '/source-filters-discover',
        {
          method: 'POST',
          body: JSON.stringify({ clientSlug, source }),
        }
      );
      // Merge discovered options with existing selections
      setSelections((prev) => {
        const merged = { ...prev };
        for (const opt of res.options) {
          if (!(opt.filter_value in merged)) {
            merged[opt.filter_value] = { active: false, label: opt.label };
          } else {
            // Update label from API
            merged[opt.filter_value] = { ...merged[opt.filter_value], label: opt.label };
          }
        }
        return merged;
      });
    } catch (e: any) {
      setError(e.message || 'Discovery failed');
    } finally {
      setDiscovering(false);
    }
  };

  const handleToggle = (filterValue: string, checked: boolean) => {
    setSelections((prev) => ({
      ...prev,
      [filterValue]: { ...prev[filterValue], active: checked },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const filtersToSave = Object.entries(selections).map(([filter_value, { active, label }]) => ({
        filter_type: filterConfig!.filterType,
        filter_value,
        label,
        active,
      }));
      await apiFetch('/source-filters-upsert', {
        method: 'PUT',
        body: JSON.stringify({ dataSourceId, filters: filtersToSave }),
      });
      onOpenChange(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const activeCount = Object.values(selections).filter((s) => s.active).length;
  const totalCount = Object.keys(selections).length;

  // All values to display: merge existing filters with discovered options
  const allValues = new Map<string, { label: string; active: boolean }>();
  for (const [val, sel] of Object.entries(selections)) {
    allValues.set(val, sel);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {filterConfig?.label} — {SOURCE_LABELS[source]}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-sm text-muted-foreground animate-pulse py-4">Loading filters...</div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDiscover}
                disabled={discovering}
              >
                {discovering ? 'Discovering...' : 'Discover from API'}
              </Button>
              {totalCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeCount}/{totalCount} selected
                </Badge>
              )}
            </div>

            {allValues.size > 0 && (
              <ScrollArea className="max-h-[300px] rounded-md border border-border-v1 p-3">
                <div className="space-y-2">
                  {Array.from(allValues.entries()).map(([val, { label, active }]) => (
                    <label
                      key={val}
                      className="flex items-center gap-2 cursor-pointer hover:bg-surface-2 rounded px-2 py-1.5 transition-colors"
                    >
                      <Checkbox
                        checked={active}
                        onCheckedChange={(checked) => handleToggle(val, !!checked)}
                      />
                      <span className="text-sm text-text-v1 truncate">{label}</span>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}

            {allValues.size === 0 && !discovering && (
              <p className="text-sm text-muted-foreground">
                No {filterConfig?.label.toLowerCase()} found. Click "Discover from API" to fetch available options.
              </p>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving || allValues.size === 0}>
                {saving ? 'Saving...' : 'Save Filters'}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Source Card ──

function SourceCard({
  clientSlug,
  source,
  existing,
  onUpdated,
}: {
  clientSlug: string;
  source: SourceType;
  existing?: { id: string; active: boolean; has_credentials: boolean; identifiers: Record<string, string> };
  onUpdated: () => void;
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [filterCount, setFilterCount] = useState<number | null>(null);
  const isActive = existing?.active ?? false;
  const hasCredentials = existing?.has_credentials ?? false;
  const canFilter = isFilterableSource(source) && hasCredentials && existing?.id;

  // Load filter count for filterable sources
  useEffect(() => {
    if (!canFilter || !existing?.id) return;
    apiFetch<{ filters: SourceFilter[] }>(`/source-filters-list?dataSourceId=${existing.id}`)
      .then((res) => {
        const active = res.filters.filter((f) => f.active).length;
        setFilterCount(active);
      })
      .catch(() => setFilterCount(null));
  }, [canFilter, existing?.id, filterOpen]);

  const handleToggle = async (checked: boolean) => {
    setToggling(true);
    try {
      await apiFetch('/client-sources-update', {
        method: 'PUT',
        body: JSON.stringify({ clientSlug, source, active: checked }),
      });
      onUpdated();
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <div className="bg-surface border border-border-v1 rounded-[11px] p-4 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-sm font-semibold text-text-v1">{SOURCE_LABELS[source]}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {hasCredentials ? (
                <span className="text-v1-green">Connected</span>
              ) : (
                <span>No credentials</span>
              )}
            </div>
          </div>
          <Switch
            checked={isActive}
            onCheckedChange={handleToggle}
            disabled={toggling}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfigOpen(true)}
            className="w-full"
          >
            Configure
          </Button>

          {canFilter && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterOpen(true)}
              className="w-full"
            >
              Filters
              {filterCount !== null && filterCount > 0 && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                  {filterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>
      </div>

      <SourceCredentialDialog
        clientSlug={clientSlug}
        source={source}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={() => {
          onUpdated();
        }}
        existingIdentifiers={existing?.identifiers}
        hasCredentials={hasCredentials}
      />

      {canFilter && existing?.id && (
        <SourceFilterDialog
          clientSlug={clientSlug}
          source={source}
          dataSourceId={existing.id}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />
      )}
    </>
  );
}

// ── Main Page ──

export function AdminClientIntegrationsPage() {
  const { clientSlug } = useParams();
  const { data, loading, error, refetch } = useClient(clientSlug);

  if (loading) {
    return (
      <div className="text-muted-foreground text-sm animate-pulse">Loading client...</div>
    );
  }

  if (error || !data) {
    return <div className="text-destructive text-sm">{error || 'Client not found'}</div>;
  }

  const sourceMap = Object.fromEntries(data.sources.map((s) => [s.source, s]));

  return (
    <>
      <AdminBreadcrumb items={[
        { label: data.client.name, href: `/admin/clients/${clientSlug}/profile` },
        { label: 'Integrations' },
      ]} />

      <h1 className="text-xl font-bold text-text-2 mb-6">Integrations</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {ALL_SOURCES.map((source) => (
          <SourceCard
            key={source}
            clientSlug={clientSlug!}
            source={source}
            existing={sourceMap[source]}
            onUpdated={refetch}
          />
        ))}
      </div>
    </>
  );
}

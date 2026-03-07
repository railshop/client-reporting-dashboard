import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClient } from '@/hooks/useClient';
import { apiFetch } from '@/lib/api';
import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { CREDENTIAL_FIELDS } from '@/shared/schemas/credentials';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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
}: {
  clientSlug: string;
  source: SourceType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const fields = CREDENTIAL_FIELDS[source];
  const fieldEntries = Object.entries(fields);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(fieldEntries.map(([k]) => [k, '']))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      await apiFetch('/client-sources-update', {
        method: 'PUT',
        body: JSON.stringify({ clientSlug, source, credentials: values }),
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
          {fieldEntries.map(([key, def]) => (
            <div key={key} className="space-y-2">
              <Label>{def.label}</Label>
              {def.multiline ? (
                <textarea
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  rows={4}
                  className={INPUT_CLS + ' resize-y font-mono text-[11px]'}
                  placeholder={def.secret ? 'Paste value...' : ''}
                />
              ) : (
                <Input
                  type={def.secret ? 'password' : 'text'}
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  placeholder={def.secret ? '••••••••' : ''}
                />
              )}
            </div>
          ))}
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

// ── Source Card ──

function SourceCard({
  clientSlug,
  source,
  existing,
  onUpdated,
}: {
  clientSlug: string;
  source: SourceType;
  existing?: { active: boolean; has_credentials: boolean; identifiers: Record<string, string> };
  onUpdated: () => void;
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isActive = existing?.active ?? false;
  const hasCredentials = existing?.has_credentials ?? false;

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
        <Button
          variant="outline"
          size="sm"
          onClick={() => setConfigOpen(true)}
          className="w-full"
        >
          Configure
        </Button>
      </div>

      <SourceCredentialDialog
        clientSlug={clientSlug}
        source={source}
        open={configOpen}
        onOpenChange={setConfigOpen}
        onSaved={() => {
          onUpdated();
        }}
      />
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

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClient } from '@/hooks/useClient';
import { apiFetch } from '@/lib/api';
import { SOURCE_LABELS, type SourceType } from '@/shared/schemas/sources';
import { CREDENTIAL_FIELDS } from '@/shared/schemas/credentials';
import { cn } from '@/lib/utils';

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-2 text-[13px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';
const LABEL_CLS = 'block font-mono text-[10px] text-text-3 mb-1.5 tracking-[0.05em]';
const ALL_SOURCES: SourceType[] = ['ga4', 'gsc', 'google_ads', 'meta', 'lsa', 'servicetitan', 'gbp'];

// ── Client Details Form ──

function ClientDetailsForm({
  client,
  onSaved,
}: {
  client: { slug: string; name: string; logo_url: string | null; active: boolean };
  onSaved: () => void;
}) {
  const [name, setName] = useState(client.name);
  const [logoUrl, setLogoUrl] = useState(client.logo_url ?? '');
  const [active, setActive] = useState(client.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await apiFetch('/client-update', {
        method: 'PUT',
        body: JSON.stringify({
          clientSlug: client.slug,
          name,
          logo_url: logoUrl || null,
          active,
        }),
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-surface border border-border-v1 rounded-[11px] px-6 py-5 mb-8">
      <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] mb-4">
        Client Details
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className={LABEL_CLS}>NAME</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className={INPUT_CLS} />
        </div>
        <div>
          <label className={LABEL_CLS}>LOGO URL</label>
          <input type="text" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className={INPUT_CLS} placeholder="https://..." />
        </div>
        <div className="flex items-center gap-3">
          <label className={LABEL_CLS + ' mb-0'}>ACTIVE</label>
          <button
            type="button"
            onClick={() => setActive(!active)}
            className={cn(
              'w-9 h-5 rounded-full transition-colors relative',
              active ? 'bg-blue' : 'bg-surface-2 border border-border-v1'
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
                active ? 'translate-x-4' : 'translate-x-0.5'
              )}
            />
          </button>
        </div>
      </div>
      {error && <p className="text-red font-mono text-[11px] mb-3">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="font-mono text-[10px] tracking-[0.05em] text-bg bg-blue px-5 py-2 rounded-lg hover:bg-blue-dim transition-colors disabled:opacity-50"
      >
        {saving ? 'SAVING...' : 'SAVE DETAILS'}
      </button>
    </form>
  );
}

// ── Source Credential Form ──

function SourceCredentialForm({
  clientSlug,
  source,
  onSaved,
  onCancel,
  existingIdentifiers,
  hasCredentials,
}: {
  clientSlug: string;
  source: SourceType;
  onSaved: () => void;
  onCancel: () => void;
  existingIdentifiers?: Record<string, string>;
  hasCredentials?: boolean;
}) {
  const fields = CREDENTIAL_FIELDS[source];
  const fieldEntries = Object.entries(fields);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      fieldEntries.map(([k, def]) => [
        k,
        !def.secret && existingIdentifiers?.[k] ? existingIdentifiers[k] : '',
      ])
    )
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (fieldEntries.length === 0) {
    return (
      <div className="px-4 py-3 text-text-3 text-[12px]">
        No credentials needed — manual entry only.
        <button onClick={onCancel} className="ml-3 text-blue hover:underline text-[11px]">Close</button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const credentials: Record<string, string> = {};
      for (const [key, val] of Object.entries(values)) {
        if (val) credentials[key] = val;
      }
      await apiFetch('/client-sources-update', {
        method: 'PUT',
        body: JSON.stringify({ clientSlug, source, credentials }),
      });
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="border-t border-border-v1 px-4 py-4">
      <div className="grid grid-cols-1 gap-3 mb-3">
        {fieldEntries.map(([key, def]) => {
          const isSavedSecret = def.secret && hasCredentials && !values[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between">
                <label className={LABEL_CLS}>{def.label}</label>
                {isSavedSecret && (
                  <span className="font-mono text-[9px] text-v1-green tracking-wide">SAVED</span>
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
                <input
                  type={def.secret ? 'password' : 'text'}
                  value={values[key]}
                  onChange={(e) => setValues({ ...values, [key]: e.target.value })}
                  className={INPUT_CLS}
                  placeholder={isSavedSecret ? 'Leave blank to keep existing value' : def.secret ? '••••••••' : ''}
                />
              )}
            </div>
          );
        })}
      </div>
      {error && <p className="text-red font-mono text-[11px] mb-3">{error}</p>}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="font-mono text-[10px] tracking-[0.05em] text-bg bg-blue px-4 py-1.5 rounded-lg hover:bg-blue-dim transition-colors disabled:opacity-50"
        >
          {saving ? 'SAVING...' : 'SAVE CREDENTIALS'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
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
  const [editing, setEditing] = useState(false);
  const [toggling, setToggling] = useState(false);
  const isActive = existing?.active ?? false;
  const hasCredentials = existing?.has_credentials ?? false;

  const handleToggle = async () => {
    setToggling(true);
    try {
      await apiFetch('/client-sources-update', {
        method: 'PUT',
        body: JSON.stringify({ clientSlug, source, active: !isActive }),
      });
      onUpdated();
    } catch {
      // silent
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden">
      <div className="px-4 py-3.5 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-text-v1">{SOURCE_LABELS[source]}</div>
          <div className="font-mono text-[10px] text-text-3 mt-0.5 flex items-center gap-2">
            {hasCredentials ? (
              <span className="text-v1-green">Connected</span>
            ) : (
              <span>No credentials</span>
            )}
            {existing?.identifiers &&
              Object.entries(existing.identifiers).map(([k, v]) => (
                <span key={k} className="text-text-3">
                  {k}: {v}
                </span>
              ))}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          disabled={toggling}
          className={cn(
            'w-9 h-5 rounded-full transition-colors relative shrink-0 disabled:opacity-50',
            isActive ? 'bg-blue' : 'bg-surface-2 border border-border-v1'
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
              isActive ? 'translate-x-4' : 'translate-x-0.5'
            )}
          />
        </button>
        <button
          onClick={() => setEditing(!editing)}
          className="font-mono text-[10px] text-text-3 hover:text-blue transition-colors shrink-0"
        >
          {editing ? 'CLOSE' : 'EDIT'}
        </button>
      </div>
      {editing && (
        <SourceCredentialForm
          clientSlug={clientSlug}
          source={source}
          onSaved={() => {
            setEditing(false);
            onUpdated();
          }}
          onCancel={() => setEditing(false)}
          existingIdentifiers={existing?.identifiers}
          hasCredentials={hasCredentials}
        />
      )}
    </div>
  );
}

// ── Main Page ──

export function AdminClientEditPage() {
  const { clientSlug } = useParams();
  const { user, logout } = useAuth();
  const { data, loading, error, refetch } = useClient(clientSlug);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-text-3 font-mono text-sm animate-pulse">Loading client...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-bg">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-red font-mono text-sm">{error || 'Client not found'}</div>
        </div>
      </div>
    );
  }

  const sourceMap = Object.fromEntries(data.sources.map((s) => [s.source, s]));

  return (
    <div className="min-h-screen bg-bg">
      {/* Topbar */}
      <div className="sticky top-0 z-[100] bg-bg border-b border-border-v1">
        <div className="max-w-[1200px] mx-auto px-6 h-[58px] flex items-center gap-4">
          <img src="/railshop.svg" alt="Railshop" className="h-5 brightness-0 invert" />
          <div className="w-px h-5 bg-border-2 flex-shrink-0" />
          <Link to="/admin" className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]">
            ← ADMIN
          </Link>
          <div className="w-px h-5 bg-border-2 flex-shrink-0" />
          <span className="text-[13px] font-semibold text-text-2">{data.client.name}</span>
          <div className="ml-auto flex items-center gap-4">
            <Link
              to={`/admin/clients/${clientSlug}/reports`}
              className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]"
            >
              REPORTS
            </Link>
            <Link
              to={`/${clientSlug}`}
              className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors tracking-[0.05em]"
            >
              VIEW DASHBOARD
            </Link>
            <span className="font-mono text-[10px] text-text-3">{user?.email}</span>
            <button onClick={logout} className="font-mono text-[10px] text-text-3 hover:text-text-2 transition-colors">
              LOGOUT
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-7">
        <h1 className="text-xl font-bold text-text-2 mb-6">Client Settings</h1>

        <ClientDetailsForm client={data.client} onSaved={refetch} />

        <div className="text-[11px] font-semibold text-text-3 uppercase tracking-[0.08em] mb-3">
          Integrations
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
      </div>
    </div>
  );
}

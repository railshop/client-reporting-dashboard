import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useClient } from '@/hooks/useClient';
import { apiFetch } from '@/lib/api';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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
    <form onSubmit={handleSave}>
      <div className="bg-surface border border-border-v1 rounded-[11px] px-6 py-6">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="client-name">Client Name</Label>
            <Input
              id="client-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo-url">Logo</Label>
            {logoUrl && (
              <div className="mb-2 flex items-center gap-3">
                <div className="size-12 rounded-lg bg-surface-2 border border-border-v1 flex items-center justify-center overflow-hidden">
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              </div>
            )}
            <Input
              id="logo-url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={active} onCheckedChange={setActive} id="active-toggle" />
            <Label htmlFor="active-toggle">Active</Label>
          </div>
        </div>

        {error && <p className="text-destructive text-sm mt-4">{error}</p>}

        <div className="mt-6">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Details'}
          </Button>
        </div>
      </div>
    </form>
  );
}

export function AdminClientProfilePage() {
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

  return (
    <>
      <AdminBreadcrumb items={[
        { label: data.client.name, href: `/admin/clients/${clientSlug}/profile` },
        { label: 'Profile' },
      ]} />

      <div className="max-w-2xl">
        <h1 className="text-xl font-bold text-text-2 mb-6">Profile</h1>
        <ClientDetailsForm client={data.client} onSaved={refetch} />
      </div>
    </>
  );
}

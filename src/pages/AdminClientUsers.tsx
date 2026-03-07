import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useClient } from '@/hooks/useClient';
import { apiFetch } from '@/lib/api';
import { cn } from '@/lib/utils';
import { AdminBreadcrumb } from '@/components/admin/AdminBreadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'client';
  client_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ── Create / Edit form ──

interface UserFormProps {
  title: string;
  initial?: { name: string; email: string };
  passwordRequired: boolean;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (data: { name: string; email: string; password: string }) => Promise<void>;
  onCancel: () => void;
}

function UserForm({ title, initial, passwordRequired, submitLabel, submittingLabel, onSubmit, onCancel }: UserFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passwordRequired && !password) {
      setError('Password is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ name, email, password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface border border-border-v1 rounded-[11px] px-6 py-5 mb-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
        </div>
        <div className="sm:col-span-2 space-y-2">
          <Label>{passwordRequired ? 'Password' : 'New Password (leave blank to keep)'}</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required={passwordRequired}
            minLength={8}
            placeholder="Min 8 characters"
          />
        </div>
      </div>
      {error && <p className="text-destructive text-sm mb-3">{error}</p>}
      <Button type="submit" disabled={submitting}>
        {submitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}

// ── User row with edit/delete ──

interface UserRowItemProps {
  u: UserRow;
  isSelf: boolean;
  isLast: boolean;
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

function UserRowItem({ u, isSelf, isLast, onDeleted, onUpdated }: UserRowItemProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async (data: { name: string; email: string; password: string }) => {
    await apiFetch('/admin-users-update', {
      method: 'PUT',
      body: JSON.stringify({ id: u.id, ...data, password: data.password || undefined, role: 'client', clientId: u.client_id }),
    });
    setEditing(false);
    onUpdated();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/admin-users-delete?id=${u.id}`, { method: 'DELETE' });
      onDeleted(u.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  };

  if (editing) {
    return (
      <div className={cn('px-5 py-4', !isLast && 'border-b border-border-v1')}>
        <UserForm
          title={`Edit — ${u.name}`}
          initial={{ name: u.name, email: u.email }}
          passwordRequired={false}
          submitLabel="Save Changes"
          submittingLabel="Saving..."
          onSubmit={handleUpdate}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-4 px-5 py-3.5', !isLast && 'border-b border-border-v1')}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">{u.name}</div>
        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 hidden md:block">
        {relativeTime(u.last_login_at)}
      </div>
      <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
        Edit
      </Button>
      {!isSelf && (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={deleting}>
                {deleting ? '...' : '✕'}
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete user?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <strong>{u.name}</strong> ({u.email}). This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ── Main page ──

export function AdminClientUsersPage() {
  const { clientSlug } = useParams();
  const { user } = useAuth();
  const { data: clientData, loading: clientLoading } = useClient(clientSlug);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = () => {
    if (!clientSlug) return;
    apiFetch<{ users: UserRow[] }>(`/admin-users-list?clientSlug=${clientSlug}`)
      .then((d) => setUsers(d.users))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
  }, [clientSlug]);

  const handleCreate = async (data: { name: string; email: string; password: string }) => {
    if (!clientData) return;
    await apiFetch('/admin-users-create', {
      method: 'POST',
      body: JSON.stringify({
        ...data,
        role: 'client',
        clientId: clientData.client.id,
      }),
    });
    setShowCreate(false);
    fetchUsers();
  };

  const handleDeleted = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  if (clientLoading) {
    return <div className="text-muted-foreground text-sm animate-pulse">Loading...</div>;
  }

  const clientName = clientData?.client.name ?? clientSlug ?? '';

  return (
    <>
      <AdminBreadcrumb items={[
        { label: clientName, href: `/admin/clients/${clientSlug}/profile` },
        { label: 'Users' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-2">Users</h1>
        {!showCreate && (
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            + Add User
          </Button>
        )}
      </div>

      {showCreate && (
        <UserForm
          title="New User"
          passwordRequired
          submitLabel="Create User"
          submittingLabel="Creating..."
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden">
        {users.length === 0 ? (
          <div className="px-5 py-4 text-muted-foreground text-sm">No users yet.</div>
        ) : (
          users.map((u, i) => (
            <UserRowItem
              key={u.id}
              u={u}
              isSelf={u.id === user?.id}
              isLast={i === users.length - 1}
              onDeleted={handleDeleted}
              onUpdated={fetchUsers}
            />
          ))
        )}
      </div>
    </>
  );
}

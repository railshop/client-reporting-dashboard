import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
  client_name: string | null;
  client_slug: string | null;
  created_at: string;
  last_login_at: string | null;
}

interface ClientOption {
  id: string;
  slug: string;
  name: string;
}

const INPUT_CLS =
  'w-full bg-surface-2 border border-border-v1 rounded-lg px-3 py-2 text-[13px] text-text-v1 placeholder:text-text-3 focus:outline-none focus:border-blue transition-colors';

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

// ── User form (shared between create and edit) ──

interface UserFormProps {
  title: string;
  clients: ClientOption[];
  initial?: { name: string; email: string; role: 'admin' | 'client'; clientId: string };
  passwordRequired: boolean;
  submitLabel: string;
  submittingLabel: string;
  onSubmit: (data: { name: string; email: string; password: string; role: 'admin' | 'client'; clientId: string | null }) => Promise<void>;
  onCancel: () => void;
}

function UserForm({ title, clients, initial, passwordRequired, submitLabel, submittingLabel, onSubmit, onCancel }: UserFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'client'>(initial?.role ?? 'client');
  const [clientId, setClientId] = useState(initial?.clientId ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (role === 'client' && !clientId) {
      setError('Select a client for this user.');
      return;
    }
    if (passwordRequired && !password) {
      setError('Password is required.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        email,
        password,
        role,
        clientId: role === 'client' ? clientId : null,
      });
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
        <div className="space-y-2">
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
        <div className="space-y-2">
          <Label>Role</Label>
          <select value={role} onChange={(e) => setRole(e.target.value as 'admin' | 'client')} className={INPUT_CLS}>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        {role === 'client' && (
          <div className="sm:col-span-2 space-y-2">
            <Label>Client</Label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={INPUT_CLS}>
              <option value="">Select client...</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
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
  clients: ClientOption[];
  onDeleted: (id: string) => void;
  onUpdated: () => void;
}

function UserRowItem({ u, isSelf, isLast, clients, onDeleted, onUpdated }: UserRowItemProps) {
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpdate = async (data: { name: string; email: string; password: string; role: 'admin' | 'client'; clientId: string | null }) => {
    await apiFetch('/admin-users-update', {
      method: 'PUT',
      body: JSON.stringify({ id: u.id, ...data, password: data.password || undefined }),
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
          clients={clients}
          initial={{ name: u.name, email: u.email, role: u.role, clientId: u.client_id ?? '' }}
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
      {u.client_name && (
        <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
          {u.client_name}
        </div>
      )}
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

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = () => {
    apiFetch<{ users: UserRow[] }>('/admin-users-list')
      .then((d) => setUsers(d.users))
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
    apiFetch<{ clients: ClientOption[] }>('/clients-list')
      .then((d) => setClients(d.clients))
      .catch(() => {});
  }, []);

  const handleCreate = async (data: { name: string; email: string; password: string; role: 'admin' | 'client'; clientId: string | null }) => {
    await apiFetch('/admin-users-create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    setShowCreate(false);
    fetchUsers();
  };

  const handleDeleted = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const admins = users.filter((u) => u.role === 'admin');
  const clientUsers = users.filter((u) => u.role === 'client');

  const renderSection = (label: string, list: UserRow[]) => (
    <section className="mb-8">
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {label} ({list.length})
      </div>
      <div className="bg-surface border border-border-v1 rounded-[11px] overflow-hidden">
        {list.length === 0 ? (
          <div className="px-5 py-4 text-muted-foreground text-sm">None yet.</div>
        ) : (
          list.map((u, i) => (
            <UserRowItem
              key={u.id}
              u={u}
              isSelf={u.id === user?.id}
              isLast={i === list.length - 1}
              clients={clients}
              onDeleted={handleDeleted}
              onUpdated={fetchUsers}
            />
          ))
        )}
      </div>
    </section>
  );

  return (
    <>
      <AdminBreadcrumb items={[
        { label: 'Railshop' },
        { label: 'Manage Users' },
      ]} />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-2">Manage Users</h1>
        {!showCreate && (
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            + Add User
          </Button>
        )}
      </div>

      {showCreate && (
        <UserForm
          title="New User"
          clients={clients}
          passwordRequired
          submitLabel="Create User"
          submittingLabel="Creating..."
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {renderSection('Admins', admins)}
      {renderSection('Users', clientUsers)}
    </>
  );
}

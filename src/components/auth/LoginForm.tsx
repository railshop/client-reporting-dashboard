import { useState, type FormEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      // Navigation handled by App.tsx based on role
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-text-3 font-mono text-[10px] uppercase tracking-[0.1em]">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="bg-surface border-border-v1 text-text-v1 focus:border-blue"
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-text-3 font-mono text-[10px] uppercase tracking-[0.1em]">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="bg-surface border-border-v1 text-text-v1 focus:border-blue"
          placeholder="Enter password"
        />
      </div>

      {error && (
        <p className="text-v1-red text-sm">{error}</p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="bg-blue text-bg font-semibold text-sm rounded-lg hover:bg-blue-dim transition-colors"
      >
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
    </form>
  );
}

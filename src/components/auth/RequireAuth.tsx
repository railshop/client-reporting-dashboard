import type { ReactNode } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RequireAuthProps {
  children: ReactNode;
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const { clientSlug } = useParams();

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-text-3 font-mono text-sm">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Admin-only routes: redirect client users to their dashboard
  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to={`/${user.clientSlug ?? ''}`} replace />;
  }

  // Client users can only view their own client's dashboard
  if (user.role === 'client' && clientSlug && user.clientSlug !== clientSlug) {
    return <Navigate to={`/${user.clientSlug ?? ''}`} replace />;
  }

  return <>{children}</>;
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { AdminHomePage } from '@/pages/AdminHome';
import { AdminUsersPage } from '@/pages/AdminUsers';

function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.clientSlug) return <Navigate to={`/${user.clientSlug}`} replace />;

  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <RequireAuth requireAdmin>
                <AdminHomePage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/users"
            element={
              <RequireAuth requireAdmin>
                <AdminUsersPage />
              </RequireAuth>
            }
          />

          {/* Client dashboard routes */}
          <Route
            path="/:clientSlug"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/:clientSlug/:period"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

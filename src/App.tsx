import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { useAuth } from '@/hooks/useAuth';
import { LoginPage } from '@/pages/Login';
import { DashboardPage } from '@/pages/Dashboard';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHomePage } from '@/pages/AdminHome';
import { AdminClientUsersPage } from '@/pages/AdminClientUsers';
import { AdminClientProfilePage } from '@/pages/AdminClientProfile';
import { AdminClientIntegrationsPage } from '@/pages/AdminClientIntegrations';
import { AdminReportsListPage } from '@/pages/AdminReportsList';
import { AdminReportEditPage } from '@/pages/AdminReportEdit';

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

          {/* Admin routes — wrapped in sidebar layout */}
          <Route
            path="/admin"
            element={
              <RequireAuth requireAdmin>
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminHomePage />} />
            <Route path="clients/:clientSlug" element={<Navigate to="profile" replace />} />
            <Route path="clients/:clientSlug/profile" element={<AdminClientProfilePage />} />
            <Route path="clients/:clientSlug/integrations" element={<AdminClientIntegrationsPage />} />
            <Route path="clients/:clientSlug/users" element={<AdminClientUsersPage />} />
            <Route path="clients/:clientSlug/reports" element={<AdminReportsListPage />} />
            <Route path="clients/:clientSlug/reports/:period" element={<AdminReportEditPage />} />
          </Route>

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

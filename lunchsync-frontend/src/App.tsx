import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/auth/LoginPage';
import { AdminLayout } from './components/admin/AdminLayout';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ProvidersPage } from './pages/admin/providers/ProvidersPage';
import { AccountsPage } from './pages/admin/accounts/AccountsPage';
import { ProviderLayout } from './components/provider/ProviderLayout';
import { ProviderDashboardPage } from './pages/provider/ProviderDashboardPage';
import { MenusPage } from './pages/provider/menus/MenusPage';
import { OrdersPage } from './pages/provider/orders/OrdersPage';
import { WhatsAppPage } from './pages/provider/whatsapp/WhatsAppPage';
import { ZonesPage } from './pages/provider/zones/ZonesPage';
import { EmployeeAuthPage } from './pages/employee/EmployeeAuthPage';
import { EmployeeRegisterPage } from './pages/employee/EmployeeRegisterPage';
import { EmployeeLayout } from './components/employee/EmployeeLayout';
import { EmployeeMenuPage } from './pages/employee/EmployeeMenuPage';
import { EmployeeOrdersPage } from './pages/employee/EmployeeOrdersPage';
import { EmployeeProfilePage } from './pages/employee/EmployeeProfilePage';

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }
  return <>{children}</>;
}

function LoginRedirect(): React.JSX.Element {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <LoginPage />;
  if (user?.role === 'superuser') return <Navigate to="/admin" replace />;
  if (user?.role === 'employee') return <Navigate to="/employee" replace />;
  return <Navigate to="/provider" replace />;
}

function AppRoutes(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/auth/login" element={<LoginRedirect />} />
      <Route path="/employee/auth" element={<EmployeeAuthPage />} />
      <Route path="/employee/register" element={<EmployeeRegisterPage />} />

      {/* Superuser Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="accounts" element={<AccountsPage />} />
      </Route>

      {/* Provider */}
      <Route
        path="/provider"
        element={
          <ProtectedRoute>
            <ProviderLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<ProviderDashboardPage />} />
        <Route path="dashboard" element={<ProviderDashboardPage />} />
        <Route path="menus" element={<MenusPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="zones" element={<ZonesPage />} />
      </Route>

      {/* Employee */}
      <Route
        path="/employee"
        element={
          <ProtectedRoute>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/employee/menu" replace />} />
        <Route path="menu" element={<EmployeeMenuPage />} />
        <Route path="orders" element={<EmployeeOrdersPage />} />
        <Route path="profile" element={<EmployeeProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/auth/login" replace />} />
    </Routes>
  );
}

function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;

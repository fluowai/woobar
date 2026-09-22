/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Delivery = lazy(() => import('./pages/Delivery'));
const DeliveryManager = lazy(() => import('./pages/DeliveryManager'));
const CourierView = lazy(() => import('./pages/CourierView'));
const BarTokens = lazy(() => import('./pages/BarTokens'));
const Events = lazy(() => import('./pages/Events'));
const CoverCharge = lazy(() => import('./pages/CoverCharge'));
const UsersPage = lazy(() => import('./pages/Users'));
const TableManager = lazy(() => import('./pages/TableManager'));
const POS = lazy(() => import('./pages/POS'));
const Validation = lazy(() => import('./pages/Validation'));
const KDS = lazy(() => import('./pages/KDS'));
const CRM = lazy(() => import('./pages/CRM'));
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'));
const TenantsList = lazy(() => import('./pages/SuperAdmin/TenantsList'));
const SaasUsers = lazy(() => import('./pages/SuperAdmin/SaasUsers'));
const SupportAdmin = lazy(() => import('./pages/SuperAdmin/SupportAdmin'));
const Helpdesk = lazy(() => import('./pages/Helpdesk'));
const ResellersList = lazy(() => import('./pages/MegaAdmin/ResellersList'));
const TableService = lazy(() => import('./pages/Waiter/TableService'));
const Integrations = lazy(() => import('./pages/Settings/Integrations'));
const PixTerminal = lazy(() => import('./pages/POS/PixTerminal'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RoleRoute({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    }>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
        
        <Route path="/" element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="resellers" element={<RoleRoute roles={['mega_admin']}><ResellersList /></RoleRoute>} />
          <Route path="tenants" element={<RoleRoute roles={['mega_admin', 'super_admin']}><TenantsList /></RoleRoute>} />
          <Route path="saas-users" element={<RoleRoute roles={['mega_admin', 'super_admin']}><SaasUsers /></RoleRoute>} />
          <Route path="support-admin" element={<RoleRoute roles={['mega_admin', 'super_admin']}><SupportAdmin /></RoleRoute>} />
          <Route path="helpdesk" element={<Helpdesk />} />
          <Route path="waiter" element={<TableService />} />
          <Route path="pix-terminal" element={<PixTerminal />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="delivery/manage" element={<DeliveryManager />} />
          <Route path="delivery/courier" element={<CourierView />} />
          <Route path="tables" element={<TableManager />} />
          <Route path="pos" element={<POS />} />
          <Route path="bar" element={<BarTokens />} />
          <Route path="events" element={<Events />} />
          <Route path="validation" element={<Validation />} />
          <Route path="kds" element={<KDS />} />
          <Route path="crm" element={<CRM />} />
          <Route path="analytics" element={<AnalyticsDashboard />} />
          <Route path="cover" element={<CoverCharge />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

import { TenantProvider } from './contexts/TenantContext';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <TenantProvider>
          <AppRoutes />
        </TenantProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

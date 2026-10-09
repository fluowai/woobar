import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import { useAuth } from './lib/auth';

const Login = lazy(() => import('./pages/Login'));
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
const Inventory = lazy(() => import('./pages/Inventory'));
const Reports = lazy(() => import('./pages/Reports'));
const CustomersCRM = lazy(() => import('./pages/CustomersCRM'));
const Channels = lazy(() => import('./pages/Channels'));
const WhatsAppPage = lazy(() => import('./pages/WhatsAppPage'));
const QRMenu = lazy(() => import('./pages/QRMenu'));
const MarketingGrowth = lazy(() => import('./pages/MarketingGrowth'));
const Kiosk = lazy(() => import('./pages/Kiosk'));
const PrintingSettings = lazy(() => import('./pages/PrintingSettings'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
    </div>
  );
}

/** Guard de rota por papel — espelha o roleGuard do backend. */
function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user, hasRole } = useAuth();
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(...roles)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-stone-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
          <h2 className="text-lg font-bold text-stone-900 mb-2">Acesso restrito</h2>
          <p className="text-sm text-stone-500 mb-6">
            Seu perfil (<strong>{user.role}</strong>) não tem permissão para acessar esta área.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

// Papéis por rota — mesmo escopo dos roleGuards do backend
const R = {
  admin: ['admin'],
  manager: ['admin', 'manager'],
  sales: ['admin', 'manager', 'waiter', 'attendant'],
  kitchen: ['admin', 'manager', 'kitchen', 'waiter', 'pantry'],
  courier: ['admin', 'manager', 'courier'],
  staff: ['admin', 'manager', 'waiter', 'attendant', 'kitchen', 'pantry', 'courier'],
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;

  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/cardapio" element={<QRMenu />} />
          <Route path="/totem" element={<Kiosk />} />
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="delivery" element={<RequireRole roles={R.sales}><Delivery /></RequireRole>} />
                <Route path="delivery/manage" element={<RequireRole roles={R.kitchen}><DeliveryManager /></RequireRole>} />
                <Route path="delivery/courier" element={<RequireRole roles={R.courier}><CourierView /></RequireRole>} />
                <Route path="tables" element={<RequireRole roles={R.sales}><TableManager /></RequireRole>} />
                <Route path="pos" element={<RequireRole roles={R.sales}><POS /></RequireRole>} />
                <Route path="bar" element={<RequireRole roles={R.sales}><BarTokens /></RequireRole>} />
                <Route path="events" element={<RequireRole roles={R.sales}><Events /></RequireRole>} />
                <Route path="validation" element={<RequireRole roles={R.staff}><Validation /></RequireRole>} />
                <Route path="cover" element={<RequireRole roles={R.sales}><CoverCharge /></RequireRole>} />
                <Route path="users" element={<RequireRole roles={R.admin}><UsersPage /></RequireRole>} />
                <Route path="kds" element={<RequireRole roles={R.kitchen}><KDS /></RequireRole>} />
                <Route path="inventory" element={<RequireRole roles={['admin', 'manager', 'pantry', 'kitchen']}><Inventory /></RequireRole>} />
                <Route path="reports" element={<RequireRole roles={R.manager}><Reports /></RequireRole>} />
                <Route path="customers" element={<RequireRole roles={R.sales}><CustomersCRM /></RequireRole>} />
                <Route path="marketing" element={<RequireRole roles={R.manager}><MarketingGrowth /></RequireRole>} />
                <Route path="channels" element={<RequireRole roles={R.manager}><Channels /></RequireRole>} />
                <Route path="whatsapp" element={<RequireRole roles={R.sales}><WhatsAppPage /></RequireRole>} />
                <Route path="settings/printing" element={<RequireRole roles={R.manager}><PrintingSettings /></RequireRole>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </>
          )}
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

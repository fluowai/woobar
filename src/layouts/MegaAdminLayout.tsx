import React from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, LayoutDashboard, LogOut, Store, Layers3, ShieldCheck } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

const navigation = [
  { path: '/mega-admin', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { path: '/mega-admin/estabelecimentos', label: 'Restaurantes', icon: Building2 },
  { path: '/mega-admin/planos', label: 'Planos e recursos', icon: Layers3 },
];

export default function MegaAdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role !== 'superadmin') {
    navigate('/');
    return null;
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-950">
        <div className="px-6 py-7 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-black tracking-tight text-lg">Woobar Mega Admin</p>
              <p className="text-xs text-slate-400">Gestão da plataforma</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <p className="px-3 mb-3 text-[11px] uppercase tracking-[0.18em] text-slate-500 font-bold">Administração</p>
          {navigation.map(({ path, label, icon: Icon, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => cn(
                'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-colors',
                isActive ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-900 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => navigate('/')} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-900 hover:text-white">
            <Store className="w-4 h-4" /> Abrir painel do restaurante
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-rose-300 hover:bg-rose-950/40">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 bg-slate-100 text-slate-900">
        <div className="md:hidden flex items-center justify-between px-4 py-4 bg-slate-950 text-white">
          <span className="font-black">Mega Admin</span>
          <button onClick={() => navigate('/')} className="text-xs font-semibold text-amber-300">Painel restaurante</button>
        </div>
        <div className="min-h-screen">
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}

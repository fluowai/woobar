import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Ticket, 
  Music2, 
  Beer, 
  Settings,
  Menu,
  X,
  ChefHat,
  Bike,
  Users,
  Armchair,
  Store,
  ScanLine,
  Package,
  BarChart3,
  Globe,
  HeartHandshake,
  MessageCircle,
  Megaphone,
  LogOut,
  TabletSmartphone
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../lib/auth';
import { motion, AnimatePresence } from 'motion/react';

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  manager: 'Gerente',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  pantry: 'Copa',
  courier: 'Entregador',
  attendant: 'Atendente',
};

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
  subItems?: { path: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
}

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const { user, logout, hasRole } = useAuth();
  const location = useLocation();

  const navSections: { title: string; items: NavItem[] }[] = [
    {
      title: 'VISÃO GERAL',
      items: [
        { path: '/', label: 'Dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'OPERAÇÃO',
      items: [
        { path: '/pos', label: 'Ponto de Venda', icon: Store, roles: ['admin', 'manager', 'waiter', 'attendant'] },
        { path: '/totem', label: 'Autoatendimento Totem', icon: TabletSmartphone },
        { path: '/tables', label: 'Gestão de Mesas', icon: Armchair, roles: ['admin', 'manager', 'waiter', 'attendant'] },
        { path: '/kds', label: 'Cozinha (KDS)', icon: ChefHat, roles: ['admin', 'manager', 'kitchen', 'waiter', 'pantry'] },
        {
          path: '/delivery',
          label: 'Delivery & Logística',
          icon: Bike,
          roles: ['admin', 'manager', 'waiter', 'attendant', 'kitchen', 'courier'],
          subItems: [
            { path: '/delivery', label: 'Novo Pedido', icon: ShoppingBag },
            { path: '/delivery/manage', label: 'Gestão (Cozinha)', icon: ChefHat },
            { path: '/delivery/courier', label: 'Entregador', icon: Bike },
          ]
        },
        { path: '/validation', label: 'Validação & Check-in', icon: ScanLine },
      ]
    },
    {
      title: 'CONSUMO',
      items: [
        { path: '/bar', label: 'Bar & Fichas', icon: Beer, roles: ['admin', 'manager', 'waiter', 'attendant'] },
        { path: '/events', label: 'Eventos & Ingressos', icon: Ticket, roles: ['admin', 'manager', 'waiter', 'attendant'] },
      ]
    },
    {
      title: 'FINANCEIRO',
      items: [
        { path: '/cover', label: 'Couvert Artístico', icon: Music2, roles: ['admin', 'manager', 'waiter', 'attendant'] },
      ]
    },
    {
      title: 'ESTOQUE & CUSTOS',
      items: [
        { path: '/inventory', label: 'Estoque & Insumos', icon: Package, roles: ['admin', 'manager', 'pantry', 'kitchen'] },
      ]
    },
    {
      title: 'CRM',
      items: [
        { path: '/customers', label: 'Clientes & Fidelidade', icon: HeartHandshake, roles: ['admin', 'manager', 'waiter', 'attendant'] },
        { path: '/marketing', label: 'Marketing & Growth', icon: Megaphone, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: 'CANAL DE VENDAS',
      items: [
        { path: '/channels', label: 'Marketplace Canais', icon: Globe, roles: ['admin', 'manager'] },
        { path: '/whatsapp', label: 'WhatsApp', icon: MessageCircle, roles: ['admin', 'manager', 'waiter', 'attendant'] },
      ]
    },
    {
      title: 'RELATÓRIOS',
      items: [
        { path: '/reports', label: 'BI & Indicadores', icon: BarChart3, roles: ['admin', 'manager'] },
      ]
    },
    {
      title: 'GESTÃO',
      items: [
        { path: '/users', label: 'Equipe & Acessos', icon: Users, roles: ['admin'] },
      ]
    }
  ]
    // Filtra itens que o papel atual não pode acessar (superadmin vê tudo)
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || hasRole(...item.roles)),
    }))
    .filter(section => section.items.length > 0);

  const isDeliveryActive = location.pathname.startsWith('/delivery');
  const handleLogout = () => { logout(); };

  return (
    <div className="flex h-screen bg-stone-50 text-stone-900 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone-200 shadow-sm z-20">
        <div className="p-6 border-b border-stone-100">
          <h1 className="text-2xl font-bold text-orange-500 font-display tracking-tight">Woobar</h1>
          <p className="text-xs text-stone-400 mt-1 uppercase tracking-wider font-medium">Management System</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {navSections.map((section, idx) => (
            <div key={idx}>
              <h3 className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                {section.title}
              </h3>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <div key={item.path}>
                    <NavLink
                      to={item.path}
                      end={item.subItems ? false : true}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group text-sm font-medium",
                          isActive && !item.subItems
                            ? "bg-orange-50 text-orange-600 shadow-sm" 
                            : "text-stone-500 hover:bg-stone-50 hover:text-stone-900",
                          item.subItems && isDeliveryActive ? "text-orange-600" : ""
                        )
                      }
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                    
                    {/* Sub-items for Delivery */}
                    {item.subItems && isDeliveryActive && (
                      <div className="ml-4 pl-4 border-l border-stone-100 mt-1 space-y-1">
                        {item.subItems.map(sub => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            end
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors",
                                isActive 
                                  ? "bg-orange-50 text-orange-600 font-medium" 
                                  : "text-stone-400 hover:text-stone-900"
                              )
                            }
                          >
                            <sub.icon className="w-3 h-3" />
                            <span>{sub.label}</span>
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-stone-100 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-4 py-2 mb-1">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-sm font-bold uppercase">
                {user.name?.charAt(0) || '?'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{user.name}</p>
                <p className="text-xs text-stone-400">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            </div>
          )}
          <NavLink to="/settings/printing" className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-stone-500 hover:bg-stone-50 hover:text-stone-900 transition-colors text-sm font-medium">
            <Settings className="w-4 h-4" />
            <span>Impressão</span>
          </NavLink>
          <button onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 z-30">
        <h1 className="text-xl font-bold text-orange-500 font-display">Woobar</h1>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 bg-white z-20 pt-20 px-4 md:hidden overflow-y-auto"
          >
            <nav className="space-y-6 pb-20">
              {navSections.map((section, idx) => (
                <div key={idx}>
                  <h3 className="px-4 text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                    {section.title}
                  </h3>
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <div key={item.path}>
                        <NavLink
                          to={item.path}
                          onClick={() => !item.subItems && setIsMobileMenuOpen(false)}
                          className={({ isActive }) =>
                            cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium",
                              isActive 
                                ? "bg-orange-50 text-orange-600" 
                                : "text-stone-500 hover:bg-stone-50"
                            )
                          }
                        >
                          <item.icon className="w-5 h-5" />
                          <span>{item.label}</span>
                        </NavLink>
                        {item.subItems && isDeliveryActive && (
                          <div className="ml-8 mt-2 space-y-2">
                            {item.subItems.map(sub => (
                              <NavLink
                                key={sub.path}
                                to={sub.path}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                  cn(
                                    "flex items-center gap-2 px-3 py-3 rounded-lg text-xs transition-colors",
                                    isActive 
                                      ? "bg-orange-50 text-orange-600 font-medium" 
                                      : "text-stone-400 hover:text-stone-900"
                                  )
                                }
                              >
                                <sub.icon className="w-4 h-4" />
                                <span>{sub.label}</span>
                              </NavLink>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </nav>
          {/* Mobile Logout */}
          <div className="pt-6 border-t border-stone-100">
            <button onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-50 transition-colors text-sm font-medium">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 bg-stone-50/50">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

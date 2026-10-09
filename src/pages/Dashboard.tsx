import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  ShoppingBag,
  CreditCard,
  ArrowUpRight,
  Clock,
  Ticket,
  Package,
  Bike,
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';

interface DashboardData {
  sales_today: number;
  orders_today: number;
  tokens_today: number;
  cover_today: number;
  pending_orders: number;
  preparing_orders: number;
}

const StatCard = ({ title, value, icon: Icon, color, loading }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
    </div>
    <h3 className="text-stone-500 text-sm font-medium mb-1">{title}</h3>
    <p className={`font-bold font-display ${loading ? 'text-stone-300 animate-pulse' : 'text-3xl text-stone-900'}`}>
      {loading ? '---' : value}
    </p>
  </motion.div>
);

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getDashboard()
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const formatCurrency = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Dashboard</h1>
          <p className="text-stone-500">Bem-vindo ao Woobar Management System.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">Hoje</p>
          <p className="text-xl font-bold text-stone-900 font-display">{today}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Vendas Hoje"
          value={loading ? '...' : formatCurrency(data?.sales_today || 0)}
          icon={TrendingUp}
          color="bg-orange-500"
          loading={loading}
        />
        <StatCard
          title="Pedidos Hoje"
          value={loading ? '...' : String(data?.orders_today || 0)}
          icon={ShoppingBag}
          color="bg-blue-500"
          loading={loading}
        />
        <StatCard
          title="Fichas Vendidas"
          value={loading ? '...' : String(data?.tokens_today || 0)}
          icon={CreditCard}
          color="bg-emerald-500"
          loading={loading}
        />
        <StatCard
          title="Couvert Hoje"
          value={loading ? '...' : String(data?.cover_today || 0)}
          icon={Users}
          color="bg-purple-500"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-stone-900">Pedidos em Andamento</h2>
          </div>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8 text-stone-400 animate-pulse">Carregando...</div>
            ) : (
              <>
                <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900">Pendentes</p>
                    <p className="text-sm text-stone-500">Aguardando confirmação</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">{data?.pending_orders || 0}</p>
                </div>
                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <Package className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-stone-900">Em Preparo</p>
                    <p className="text-sm text-stone-500">Sendo preparados na cozinha</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{data?.preparing_orders || 0}</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
            <h3 className="text-lg font-bold mb-1">Resumo do Dia</h3>
            <p className="text-orange-100 text-sm mb-6">Indicadores operacionais</p>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Vendas</span>
                <span className="font-bold text-lg">
                  {loading ? '...' : formatCurrency(data?.sales_today || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Fichas</span>
                <span className="font-bold text-lg">
                  {loading ? '...' : String(data?.tokens_today || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Pedidos</span>
                <span className="font-bold text-lg">
                  {loading ? '...' : String(data?.orders_today || 0)}
                </span>
              </div>
              <div className="pt-4 border-t border-orange-400/30 flex justify-between text-sm">
                <span className="text-orange-100">Couvert: {data?.cover_today || 0}</span>
                <span className="text-orange-100">Preparando: {data?.preparing_orders || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

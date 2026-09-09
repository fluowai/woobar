import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  CreditCard,
  ArrowUpRight,
  Clock,
  Ticket,
  BarChart3
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalTickets: number;
  totalTokens: number;
  occupancy: number;
  recentActivity: Array<{
    id: string;
    type: 'order' | 'ticket' | 'token';
    description: string;
    amount: number;
    time: string;
  }>;
}

const StatCard = ({ title, value, change, icon: Icon, color, onClick }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={onClick}
    className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100 cursor-pointer hover:shadow-md transition-all"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      {change && (
        <span className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded-lg">
          <ArrowUpRight className="w-3 h-3 mr-1" />
          {change}
        </span>
      )}
    </div>
    <h3 className="text-stone-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-bold text-stone-900 font-display">{value}</p>
  </motion.div>
);

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSales: 0,
    totalOrders: 0,
    totalTickets: 0,
    totalTokens: 0,
    occupancy: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      const [
        { data: salesData, error: salesError },
        { data: ordersData, error: ordersError },
        { data: coverData, error: coverError }
      ] = await Promise.all([
        supabase
          .from('sold_items')
          .select('price, type, purchase_time, item_name')
          .gte('purchase_time', today),
        supabase
          .from('orders')
          .select('total, created_at, id')
          .gte('created_at', today),
        supabase
          .from('cover_charge_transactions')
          .select('type, timestamp')
          .gte('timestamp', today)
      ]);

      if (salesError || ordersError || coverError) {
        console.error('Error loading stats:', { salesError, ordersError, coverError });
        return;
      }

      const totalSales = [
        ...(salesData || []).map(s => s.price),
        ...(ordersData || []).map(o => o.total)
      ].reduce((acc, val) => acc + (val || 0), 0);

      const totalTickets = (salesData || []).filter(s => s.type === 'ticket').length;
      const totalTokens = (salesData || []).filter(s => s.type === 'token').length;
      const totalOrders = (ordersData || []).length;

      let occupancy = 0;
      if (coverData) {
        let count = 0;
        coverData.forEach(t => {
          if (t.type === 'entry') count++;
          else if (t.type === 'exit') count--;
        });
        occupancy = Math.max(0, count);
      }

      const recentActivity = [
        ...(salesData || []).slice(0, 5).map(s => ({
          id: `sale-${s.purchase_time}`,
          type: s.type as 'ticket' | 'token',
          description: s.item_name,
          amount: s.price,
          time: s.purchase_time
        })),
        ...(ordersData || []).slice(0, 5).map(o => ({
          id: `order-${o.id}`,
          type: 'order' as const,
          description: `Pedido #${o.id.slice(0, 8)}`,
          amount: o.total,
          time: o.created_at
        }))
      ]
        .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
        .slice(0, 10);

      setStats({
        totalSales,
        totalOrders,
        totalTickets,
        totalTokens,
        occupancy,
        recentActivity
      });
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins} min atrás`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2).replace('.', ',')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Dashboard</h1>
          <p className="text-stone-500">Bem-vindo ao Woobar Management System.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-stone-400 font-medium uppercase tracking-wider">Hoje</p>
          <p className="text-xl font-bold text-stone-900 font-display">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Vendas Totais" 
          value={formatCurrency(stats.totalSales)}
          change="+12%" 
          icon={TrendingUp} 
          color="bg-orange-500 text-orange-600"
          onClick={() => navigate('/pos')}
        />
        <StatCard 
          title="Pedidos Delivery" 
          value={stats.totalOrders.toString()}
          change="+5%" 
          icon={ShoppingBag} 
          color="bg-blue-500 text-blue-600"
          onClick={() => navigate('/delivery/manage')}
        />
        <StatCard 
          title="Ingressos Vendidos" 
          value={stats.totalTickets.toString()}
          change="+18%" 
          icon={Ticket} 
          color="bg-purple-500 text-purple-600"
          onClick={() => navigate('/events')}
        />
        <StatCard 
          title="Fichas Bar" 
          value={stats.totalTokens.toString()}
          change="+8%" 
          icon={CreditCard} 
          color="bg-emerald-500 text-emerald-600"
          onClick={() => navigate('/bar')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-stone-900">Atividade Recente</h2>
            <button 
              onClick={() => loadStats()}
              className="text-sm text-orange-500 font-medium hover:text-orange-600 flex items-center gap-1"
            >
              <BarChart3 className="w-4 h-4" />
              Atualizar
            </button>
          </div>
          <div className="space-y-4">
            {stats.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-stone-400">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma atividade hoje</p>
              </div>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-stone-50 rounded-xl transition-colors border border-transparent hover:border-stone-100">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      activity.type === 'order' ? 'bg-blue-100 text-blue-600' :
                      activity.type === 'ticket' ? 'bg-purple-100 text-purple-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {activity.type === 'order' ? <ShoppingBag className="w-5 h-5" /> :
                       activity.type === 'ticket' ? <Ticket className="w-5 h-5" /> :
                       <CreditCard className="w-5 h-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{activity.description}</p>
                      <p className="text-sm text-stone-500">
                        {activity.type === 'order' ? 'Delivery' : 
                         activity.type === 'ticket' ? 'Ingresso' : 'Ficha'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-stone-900">{formatCurrency(activity.amount)}</p>
                    <p className="text-xs text-stone-400 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3" /> {formatTime(activity.time)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="space-y-6">
          <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
            <h3 className="text-lg font-bold mb-1">Status do Bar</h3>
            <p className="text-orange-100 text-sm mb-6">Visão geral do movimento</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Lotação Atual</span>
                <span className="font-bold text-2xl">{stats.occupancy}</span>
              </div>
              <div className="pt-4 border-t border-orange-400/30 flex justify-between text-sm">
                <span className="text-orange-100">Pessoas no local</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h3 className="font-bold text-stone-900 mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => navigate('/pos')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-orange-50 text-stone-600 hover:text-orange-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-orange-100"
              >
                <CreditCard className="w-5 h-5" />
                Vender Ficha
              </button>
              <button 
                onClick={() => navigate('/delivery')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-blue-50 text-stone-600 hover:text-blue-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-blue-100"
              >
                <ShoppingBag className="w-5 h-5" />
                Novo Pedido
              </button>
              <button 
                onClick={() => navigate('/validation')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-purple-50 text-stone-600 hover:text-purple-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-purple-100"
              >
                <Users className="w-5 h-5" />
                Check-in
              </button>
              <button 
                onClick={() => navigate('/events')}
                className="p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 text-stone-600 hover:text-emerald-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-emerald-100"
              >
                <Ticket className="w-5 h-5" />
                Ingresso
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

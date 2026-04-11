import React from 'react';
import { 
  TrendingUp, 
  Users, 
  ShoppingBag, 
  CreditCard,
  ArrowUpRight,
  Clock,
  Ticket
} from 'lucide-react';
import { motion } from 'motion/react';

const StatCard = ({ title, value, change, icon: Icon, color }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <span className="flex items-center text-emerald-600 text-sm font-medium bg-emerald-50 px-2 py-1 rounded-lg">
        <ArrowUpRight className="w-3 h-3 mr-1" />
        {change}
      </span>
    </div>
    <h3 className="text-stone-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-3xl font-bold text-stone-900 font-display">{value}</p>
  </motion.div>
);

export default function Dashboard() {
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
          value="R$ 12.450" 
          change="+12%" 
          icon={TrendingUp} 
          color="bg-orange-500 text-orange-600" 
        />
        <StatCard 
          title="Pedidos Delivery" 
          value="48" 
          change="+5%" 
          icon={ShoppingBag} 
          color="bg-blue-500 text-blue-600" 
        />
        <StatCard 
          title="Ingressos Vendidos" 
          value="156" 
          change="+18%" 
          icon={Users} 
          color="bg-purple-500 text-purple-600" 
        />
        <StatCard 
          title="Fichas Bar" 
          value="342" 
          change="+8%" 
          icon={CreditCard} 
          color="bg-emerald-500 text-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-stone-900">Atividade Recente</h2>
            <button className="text-sm text-orange-500 font-medium hover:text-orange-600">Ver tudo</button>
          </div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 hover:bg-stone-50 rounded-xl transition-colors border border-transparent hover:border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-500">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium text-stone-900">Pedido #202{i}</p>
                    <p className="text-sm text-stone-500">2x Burger Woobar, 1x Coca-Cola</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stone-900">R$ 84,00</p>
                  <p className="text-xs text-stone-400 flex items-center justify-end gap-1">
                    <Clock className="w-3 h-3" /> 12 min atrás
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Status */}
        <div className="space-y-6">
          <div className="bg-orange-500 rounded-2xl p-6 text-white shadow-lg shadow-orange-200">
            <h3 className="text-lg font-bold mb-1">Status do Bar</h3>
            <p className="text-orange-100 text-sm mb-6">Visão geral do movimento</p>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-orange-100">Lotação</span>
                <span className="font-bold text-2xl">85%</span>
              </div>
              <div className="w-full bg-orange-400/30 rounded-full h-2">
                <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <div className="pt-4 border-t border-orange-400/30 flex justify-between text-sm">
                <span className="text-orange-100">Entradas: 240</span>
                <span className="text-orange-100">Saídas: 45</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h3 className="font-bold text-stone-900 mb-4">Acesso Rápido</h3>
            <div className="grid grid-cols-2 gap-3">
              <button className="p-3 rounded-xl bg-stone-50 hover:bg-orange-50 text-stone-600 hover:text-orange-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-orange-100">
                <CreditCard className="w-5 h-5" />
                Vender Ficha
              </button>
              <button className="p-3 rounded-xl bg-stone-50 hover:bg-blue-50 text-stone-600 hover:text-blue-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-blue-100">
                <ShoppingBag className="w-5 h-5" />
                Novo Pedido
              </button>
              <button className="p-3 rounded-xl bg-stone-50 hover:bg-purple-50 text-stone-600 hover:text-purple-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-purple-100">
                <Users className="w-5 h-5" />
                Check-in
              </button>
              <button className="p-3 rounded-xl bg-stone-50 hover:bg-emerald-50 text-stone-600 hover:text-emerald-600 transition-colors text-sm font-medium flex flex-col items-center gap-2 border border-stone-100 hover:border-emerald-100">
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

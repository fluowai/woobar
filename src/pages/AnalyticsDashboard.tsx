import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, BarChart, Bar,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Package, TrendingUp, Users, CalendarDays } from 'lucide-react';

const COLORS = ['#0EA5E9', '#F97316', '#8B5CF6', '#10B981', '#F59E0B'];

export default function AnalyticsDashboard() {
  const { tenantId } = useTenant();
  const [dateRange, setDateRange] = useState('30d');
  const [metrics, setMetrics] = useState<any>({
    salesData: [],
    productData: [],
    ticketSales: [],
    summary: { totalSales: 0, totalOrders: 0, avgTicket: 0 }
  });

  useEffect(() => {
    if (!tenantId) return;
    
    const fetchData = async () => {
      // Sales over time
      const { data: salesData } = await supabase
        .from('orders')
        .select('created_at,total')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${dateRange}d ago`);
      setMetrics(m => ({ ...m, salesData: salesData || [] }));
      
      // Product sales
      const { data: productData } = await supabase
        .from('sold_items')
        .select('item_name,price')
        .eq('tenant_id', tenantId);
      setMetrics(m => ({ ...m, productData: productData || [] }));

      // Ticket Sales (Events)
      const { data: ticketSales } = await supabase
        .from('sold_items')
        .select('created_at,price,type')
        .eq('tenant_id', tenantId)
        .eq('type', 'ticket');
      setMetrics(m => ({ ...m, ticketSales: ticketSales || [] }));
    };

    fetchData();

    // Realtime listener
      const channel = supabase
        .channel(`tenant_${tenantId}_analytics`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { fetchData(); })
        .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, dateRange]);

  return (
    <div className="p-6 bg-slate-100 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="text-violet-600" /> Analytics
        </h1>
        <div className="flex gap-4 mt-4">
          {['7d', '30d', '90d'].map(d => (
            <button
              key={d}
              onClick={() => setDateRange(d)}
              className={`px-4 py-2 rounded-lg font-medium ${
                dateRange === d ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 shadow'
              }`}
            >
              Últimos {d}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><Package size={16} /> Vendas do Período</p>
          <p className="text-3xl font-bold text-slate-900">R$ {metrics.summary.totalSales.toLocaleString('pt-BR')}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><Users size={16} /> Pedidos</p>
          <p className="text-3xl font-bold text-slate-900">{metrics.summary.totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-2 flex items-center gap-2"><CalendarDays size={16} /> Ticket Médio</p>
          <p className="text-3xl font-bold text-slate-900">R$ {metrics.summary.avgTicket.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <p className="text-sm font-medium text-slate-500 mb-2">Taxa de Conversão</p>
          <p className="text-3xl font-bold text-slate-900">34,2%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Vendas por Período</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.salesData}>
              <XAxis dataKey="created_at" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="total" stroke="#0EA5E9" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-white p-6 rounded-xl shadow border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Vendas por Produto</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.productData}>
              <XAxis dataKey="item_name" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="price" fill="#F97316" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

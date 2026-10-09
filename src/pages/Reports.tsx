import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, DollarSign, Receipt, ArrowUpDown, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

export default function Reports() {
  const [dash, setDash] = useState<any>(null);
  const [dre, setDre] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [period, setPeriod] = useState('today');

  useEffect(() => { loadData(); }, [period]);

  const loadData = async () => {
    try {
      const d = await api.getDashboard();
      setDash(d);

      const end = new Date().toISOString().split('T')[0];
      let start = end;
      if (period === 'week') { const d = new Date(); d.setDate(d.getDate() - 7); start = d.toISOString().split('T')[0]; }
      if (period === 'month') { const d = new Date(); d.setDate(d.getDate() - 30); start = d.toISOString().split('T')[0]; }

      const dreData = await api.getDRE(start, end);
      setDre(dreData);

      const top = await api.getTopProducts(start, end, 10);
      setTopProducts(top);
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900">Relatórios & BI</h1>
          <p className="text-stone-500">Análise de desempenho do negócio</p>
        </div>
        <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
          {['today', 'week', 'month'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", period === p ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}>
              {p === 'today' ? 'Hoje' : p === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Vendas Hoje" value={dash ? `R$ ${Number(dash.sales_today).toFixed(2)}` : '---'} icon={DollarSign} color="bg-emerald-100 text-emerald-600" />
        <MetricCard title="Pedidos" value={dash?.orders_today || '---'} icon={Receipt} color="bg-blue-100 text-blue-600" />
        <MetricCard title="Fichas Vendidas" value={dash?.tokens_today || '---'} icon={BarChart3} color="bg-purple-100 text-purple-600" />
        <MetricCard title="Couvert Hoje" value={dash?.cover_today || '---'} icon={TrendingUp} color="bg-orange-100 text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {dre && (
          <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
            <h3 className="font-bold text-lg text-stone-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500" />
              DRE — Demonstrativo de Resultados
            </h3>
            <div className="space-y-3">
              <Row label="Receita Bruta (Pedidos)" value={`R$ ${Number(dre.revenue.gross).toFixed(2)}`} />
              <Row label="Couvert Artístico" value={`R$ ${Number(dre.revenue.cover).toFixed(2)}`} />
              <Row label="Bar / Fichas" value={`R$ ${Number(dre.revenue.bar).toFixed(2)}`} />
              <Row label="Ingressos" value={`R$ ${Number(dre.revenue.tickets).toFixed(2)}`} />
              <div className="border-t border-stone-200 pt-2 font-bold text-lg flex justify-between">
                <span>Receita Total</span>
                <span className="text-emerald-600">R$ {Number(dre.revenue.total).toFixed(2)}</span>
              </div>
              <div className="border-t border-stone-200 pt-2 text-red-600">
                <Row label="Custo Insumos" value={`R$ ${Number(dre.costs.inventory).toFixed(2)}`} />
                <Row label="Tributos (estimado)" value={`R$ ${Number(dre.costs.estimated_taxes).toFixed(2)}`} />
              </div>
              <div className="border-t-2 border-stone-900 pt-2 font-bold text-xl flex justify-between">
                <span>Resultado Líquido</span>
                <span className={dre.net >= 0 ? "text-emerald-600" : "text-red-600"}>
                  R$ {Number(dre.net).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="font-bold text-lg text-stone-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Produtos Mais Vendidos
          </h3>
          <div className="space-y-3">
            {(topProducts as any)?.table_products?.length > 0 ? (
              (topProducts as any).table_products.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-stone-400 w-5">{i + 1}º</span>
                    <span className="font-medium text-stone-900">{p.product_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-stone-900">{p.sold}x</span>
                    <span className="text-xs text-stone-500 ml-2">R$ {Number(p.revenue).toFixed(2)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-stone-400 text-center py-8">Nenhum dado disponível</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, color }: any) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-6 rounded-2xl shadow-sm border border-stone-100">
      <div className={`p-3 rounded-xl ${color} bg-opacity-10 w-fit mb-4`}>
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-stone-500 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-stone-900 font-display">{value}</p>
    </motion.div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-stone-500">{label}</span>
      <span className="font-mono font-medium">{value}</span>
    </div>
  );
}

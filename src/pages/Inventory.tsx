import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, AlertTriangle, Plus, Search, TrendingDown, TrendingUp, ChefHat } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

export default function Inventory() {
  const [items, setItems] = useState<any[]>([]);
  const [tab, setTab] = useState<'items' | 'recipes'>('items');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [movementModal, setMovementModal] = useState<string | null>(null);

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try { setItems(await api.getInventory()); } catch {}
  };

  const filtered = items.filter((i: any) => i.name.toLowerCase().includes(search.toLowerCase()));
  const alerts = filtered.filter((i: any) => i.alert === 'low');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900">Estoque & Insumos</h1>
          <p className="text-stone-500">Gestão de inventário e receitas</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 shadow-lg shadow-stone-200">
          <Plus className="w-4 h-4" /> Novo Item
        </button>
      </div>

      <div className="flex gap-2">
        {(['items', 'recipes'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-2 rounded-xl text-sm font-bold transition-all", tab === t ? "bg-stone-900 text-white" : "bg-white text-stone-600 border border-stone-200")}>
            {t === 'items' ? '📦 Itens' : '👨‍🍳 Receitas'}
          </button>
        ))}
        <div className="relative flex-1 max-w-xs ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-stone-200" />
        </div>
      </div>

      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <span className="font-bold text-red-800">{alerts.length} itens com estoque baixo</span>
        </motion.div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4 text-left">Item</th>
                <th className="px-6 py-4 text-left">Categoria</th>
                <th className="px-6 py-4 text-right">Estoque</th>
                <th className="px-6 py-4 text-right">Mínimo</th>
                <th className="px-6 py-4 text-right">Custo Unit.</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.map((item: any) => (
                <tr key={item.id} className={cn("hover:bg-stone-50/50 transition-colors", item.alert === 'low' && "bg-red-50/30")}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-stone-400" />
                      <span className="font-bold text-stone-900">{item.name}</span>
                      <span className="text-xs text-stone-400">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-stone-500">{item.category}</td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn("font-mono font-bold", item.alert === 'low' ? "text-red-600" : "text-emerald-600")}>
                      {item.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-stone-500 font-mono">{item.min_stock}</td>
                  <td className="px-6 py-4 text-right font-mono text-stone-700">R$ {Number(item.cost_price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => setMovementModal(item.id)} className="px-3 py-1 bg-stone-100 hover:bg-stone-200 rounded-lg text-xs font-bold transition-colors">
                      Movimentar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

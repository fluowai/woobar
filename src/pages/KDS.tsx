import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChefHat, CheckCircle, AlertCircle, Timer } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

interface OrderItem {
  id: string;
  table_order_id: string;
  product_name: string;
  quantity: number;
  notes: string;
  status: string;
  created_at: string;
}

interface KDSOrder {
  id: string;
  table_name: string;
  customer_name: string;
  items: OrderItem[];
  elapsed: string;
  status: string;
}

export default function KDS() {
  const [orders, setOrders] = useState<KDSOrder[]>([]);
  const [kioskOrders, setKioskOrders] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing'>('all');
  const [loadError, setLoadError] = useState('');
  const [loadedOnce, setLoadedOnce] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadOrders = async () => {
    try {
      const tableOrders = await api.getTableOrders();
      const detailed = await Promise.all(
        (Array.isArray(tableOrders) ? tableOrders : []).map(async (o: any) => {
          const detail = await api.getTableOrder(o.id);
          const pending = ((detail as any).items || []).filter((i: any) => i.status === 'pending' || i.status === 'preparing');
          const elapsed = getElapsed(o.opened_at);
          return { ...detail, table_name: o.table_name, elapsed, items: pending };
        })
      );
      setOrders(detailed.filter((o: any) => o.items.length > 0));
      const channelOrders = await api.getOrders();
      setKioskOrders((Array.isArray(channelOrders) ? channelOrders : []).filter((o: any) => o.channel === 'kiosk' && ['pending', 'preparing', 'ready'].includes(o.status)));
      setLoadError('');
    } catch (e: any) {
      setLoadError(e.message || 'Falha ao carregar pedidos');
    } finally {
      setLoadedOnce(true);
    }
  };

  const updateKioskStatus = async (id: string, status: string) => {
    try { await api.updateOrderStatus(id, status); await loadOrders(); } catch (e) { toast.error(e); }
  };

  const updateItemStatus = async (itemId: string, status: string) => {
    try {
      await api.updateOrderItemStatus(itemId, status);
      loadOrders();
    } catch (e) { toast.error(e); }
  };

  const filteredOrders = orders.filter(o => filter === 'all' || o.items.some(i => i.status === filter));

  const pendingItems = orders.reduce((acc, o) => acc + o.items.filter(i => i.status === 'pending').length, 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-stone-900">KDS — Cozinha</h1>
          <p className="text-stone-500">Display de preparo em tempo real</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2", pendingItems > 5 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700")}>
            <AlertCircle className="w-4 h-4" />
            {pendingItems} pendentes
          </div>
          <div className="flex bg-stone-100 rounded-xl p-1 border border-stone-200">
            {(['all', 'pending', 'preparing'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", filter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500")}>
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Novos' : 'Preparando'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loadedOnce && loadError && orders.length === 0 && kioskOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button onClick={() => { setLoadedOnce(false); loadOrders(); }} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">
              Tentar novamente
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kioskOrders.map(order => {
            const items = (() => { try { return JSON.parse(order.items_json || '[]'); } catch { return []; } })();
            return <motion.div key={order.id} layout className="bg-white rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden">
              <div className="bg-orange-500 text-white px-5 py-4 flex justify-between items-center"><div><p className="text-xs font-bold text-orange-100">TOTEM</p><h3 className="font-bold text-lg">Pedido #{order.id.slice(0,6).toUpperCase()}</h3><p className="text-xs text-orange-100">{order.customer_name}</p></div><span className="font-bold uppercase text-xs bg-white/20 px-3 py-1 rounded-full">{order.status === 'pending' ? 'Novo' : order.status === 'preparing' ? 'Preparando' : 'Pronto'}</span></div>
              <div className="p-4 space-y-3">{items.map((item:any, index:number)=><div key={index} className="p-3 rounded-xl bg-stone-50 flex justify-between"><strong>{item.quantity}x {item.name}</strong><span>R$ {(item.quantity*item.price).toFixed(2)}</span></div>)}<div className="font-bold flex justify-between border-t pt-3"><span>Total</span><span>R$ {Number(order.total).toFixed(2)}</span></div>{order.status==='pending'&&<button onClick={()=>updateKioskStatus(order.id,'preparing')} className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold">Iniciar preparo</button>}{order.status==='preparing'&&<button onClick={()=>updateKioskStatus(order.id,'ready')} className="w-full py-3 bg-emerald-500 text-white rounded-xl font-bold">Marcar como pronto</button>}{order.status==='ready'&&<button onClick={()=>updateKioskStatus(order.id,'delivered')} className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold">Pedido retirado</button>}</div>
            </motion.div>;
          })}
          {filteredOrders.map(order => (
            <motion.div key={order.id} layout className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
              <div className="bg-stone-900 text-white px-5 py-4 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg">{order.table_name}</h3>
                  {order.customer_name && <p className="text-xs text-stone-400">{order.customer_name}</p>}
                </div>
                <div className="flex items-center gap-2 text-amber-400 text-sm font-mono">
                  <Timer className="w-4 h-4" />
                  {order.elapsed}
                </div>
              </div>
              <div className="p-4 space-y-3">
                {order.items.map(item => (
                  <div key={item.id} className={cn("p-4 rounded-xl border-2 transition-all", item.status === 'pending' ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200")}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-lg font-bold text-stone-900">{item.quantity}x </span>
                        <span className="text-lg font-bold text-stone-900">{item.product_name}</span>
                      </div>
                      <span className={cn("px-2 py-1 rounded text-xs font-bold", item.status === 'pending' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700")}>
                        {item.status === 'pending' ? 'NOVO' : 'PREPARANDO'}
                      </span>
                    </div>
                    {item.notes && <p className="text-sm text-stone-500 mb-3">📝 {item.notes}</p>}
                    <div className="flex gap-2">
                      {item.status === 'pending' && (
                        <button onClick={() => updateItemStatus(item.id, 'preparing')} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600 transition-colors">
                          Iniciar Preparo
                        </button>
                      )}
                      {item.status === 'preparing' && (
                        <button onClick={() => updateItemStatus(item.id, 'ready')} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Finalizar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
          {filteredOrders.length === 0 && kioskOrders.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-stone-400">
              <ChefHat className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg font-medium">Cozinha vazia</p>
              <p className="text-sm">Nenhum item aguardando preparo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getElapsed(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

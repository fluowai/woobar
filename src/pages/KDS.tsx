import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import type { Order } from '../lib/database.types';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Clock, Utensils, AlertTriangle } from 'lucide-react';

export default function KDS() {
  const { user } = useAuth();
  const { tenantId } = useTenant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!tenantId) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) console.error('Error fetching orders:', error);
      else setOrders(data as Order[]);
    };

    fetchOrders();

    const channel = supabase
      .channel(`tenant_${tenantId}_kds`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders',
        filter: `tenant_id=eq.${tenantId}` 
      }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);
    
    if (error) console.error('Error updating order status:', error);
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(o => o.kitchenStation === filter);

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Utensils className="text-orange-500" /> Kitchen Display System
        </h1>
        <div className="flex gap-2">
          {['all', 'kitchen', 'bar', 'grill', 'pizza', 'dessert'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
                filter === s ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <AnimatePresence>
          {filteredOrders.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-slate-800 rounded-xl overflow-hidden border-2 ${
                order.status === 'preparing' ? 'border-orange-500' : 
                order.status === 'ready' ? 'border-green-500' : 'border-slate-700'
              }`}
            >
              <div className="p-4 bg-slate-700/50 flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">#{order.id.slice(-4)}</h3>
                  <p className="text-sm text-slate-400">{order.customer}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                    order.priority > 0 ? 'bg-red-500 text-white' : 'bg-slate-600 text-slate-300'
                  }`}>
                    {order.priority > 0 ? 'Urgent' : 'Normal'}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={12} /> {new Date(order.createdAt || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-3 min-h-[150px]">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <span className="font-bold text-orange-500">{item.quantity}x</span>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.variationId && <p className="text-xs text-slate-500 italic">Variation: {item.variationId}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-900/50 grid grid-cols-2 gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => updateStatus(order.id, 'preparing')}
                    className="col-span-2 py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Utensils size={18} /> START PREPARING
                  </button>
                )}
                {order.status === 'preparing' && (
                  <button
                    onClick={() => updateStatus(order.id, 'ready')}
                    className="col-span-2 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> MARK READY
                  </button>
                )}
                {order.status === 'ready' && (
                  <button
                    onClick={() => updateStatus(order.id, 'delivered')}
                    className="col-span-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> DELIVERED
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Utensils size={64} className="mb-4 opacity-20" />
          <p className="text-xl">No active orders in this station</p>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, CheckCircle, Navigation, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';
import { useAuth } from '../contexts/AuthContext';

interface CourierOrder {
  id: string;
  customer: string;
  address: string;
  phone?: string;
  total: number;
  paymentMethod?: string;
  status: string;
  items: any[];
}

export default function CourierView() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMyOrders = useCallback(async () => {
    if (!user) return;
    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('courier_id', user.id)
        .in('status', ['delivering', 'ready'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map((o: any) => ({
        id: o.id,
        customer: o.customer,
        address: o.address || 'Sem endereço',
        phone: o.customer_phone,
        total: o.total,
        paymentMethod: o.payment_method,
        status: o.status,
        items: Array.isArray(o.items) ? o.items : []
      })));
    } catch (err) {
      console.error('Error fetching courier orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyOrders();
  }, [fetchMyOrders]);

  const markDelivered = async (orderId: string) => {
    try {
      const tenantId = await resolveTenantId();
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'delivered',
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error('Error marking delivered:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-stone-900">Minhas Entregas</h2>
        <p className="text-stone-500">Olá, {user?.name || 'Entregador'}</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-20">
        {orders.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma entrega atribuída</p>
            <p className="text-sm mt-1">Aguardando pedidos prontos...</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div
              key={order.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold mb-1">
                    {order.status === 'delivering' ? 'EM ROTA' : 'AGUARDANDO RETIRADA'}
                  </span>
                  <h3 className="font-bold text-stone-900 text-lg">{order.customer}</h3>
                </div>
                <span className="font-mono font-medium text-stone-500">#{order.id.slice(0, 8)}</span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3 text-stone-600">
                  <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm leading-tight">{order.address}</p>
                </div>
                {order.phone && (
                  <div className="flex items-center gap-3 text-stone-600">
                    <Phone className="w-5 h-5 text-stone-400 flex-shrink-0" />
                    <p className="text-sm">{order.phone}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl mb-4">
                <span className="text-xs font-bold text-stone-400 uppercase">Cobrar na entrega</span>
                <div className="text-right">
                  <p className="font-bold text-stone-900">R$ {Number(order.total).toFixed(2)}</p>
                  <p className="text-xs text-stone-500">{order.paymentMethod || 'Não definido'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50"
                >
                  <Navigation className="w-4 h-4" />
                  Waze
                </a>
                <button 
                  onClick={() => markDelivered(order.id)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200"
                >
                  <CheckCircle className="w-4 h-4" />
                  Entregue
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

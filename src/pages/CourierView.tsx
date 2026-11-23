import React, { useEffect, useState, useCallback } from 'react';
import { MapPin, Phone, CheckCircle, Navigation, Loader2, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useToast } from '../components/Toast';

interface CourierOrder {
  id: string;
  displayId: string;
  customer: string;
  address: string;
  phone: string;
  total: number;
  payment: string;
  status: 'ready' | 'delivering';
  mine: boolean;
}

export default function CourierView() {
  const [orders, setOrders] = useState<CourierOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const { user: me } = useAuth();
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const data = await api.getOrders();
      const list: CourierOrder[] = (Array.isArray(data) ? data : [])
        .filter((o: any) => ['ready', 'delivering'].includes(o.status))
        .filter((o: any) => o.courier_id === me?.id || o.status === 'ready')
        .map((o: any) => ({
          id: o.id,
          displayId: `#${String(o.id).slice(0, 6).toUpperCase()}`,
          customer: o.customer_name || 'Cliente',
          address: o.customer_address || 'Retirada no balcão',
          phone: o.customer_phone || '—',
          total: Number(o.total) || 0,
          payment: o.payment_method || '—',
          status: o.status,
          mine: o.courier_id === me?.id,
        }));
      setOrders(list);
      setLoadError('');
    } catch (e: any) {
      setLoadError(e.message || 'Falha ao carregar entregas');
    } finally {
      setLoading(false);
    }
  }, [me?.id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const accept = async (order: CourierOrder) => {
    setBusyId(order.id);
    try {
      await api.updateOrderStatus(order.id, 'delivering', me?.id);
      toast.success(`Entrega ${order.displayId} assumida`);
      await load();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const deliver = async (order: CourierOrder) => {
    setBusyId(order.id);
    try {
      await api.updateOrderStatus(order.id, 'delivered');
      toast.success(`${order.displayId} entregue!`);
      await load();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusyId(null);
    }
  };

  const openWaze = (address: string) => {
    window.open(`https://www.waze.com/ul?q=${encodeURIComponent(address)}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Carregando entregas...</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex flex-col items-center justify-center gap-4 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <button onClick={() => { setLoading(true); load(); }} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-stone-900">Minhas Entregas</h2>
        <p className="text-stone-500">Olá, {me?.name?.split(' ')[0] || 'entregador'}</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-20">
        {orders.length === 0 && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-100 text-center text-stone-400">
            <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhuma entrega disponível no momento.</p>
          </div>
        )}
        {orders.map((order) => (
          <motion.div
            key={order.id}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs font-bold mb-1">
                  {order.status === 'delivering' && order.mine ? 'EM ROTA' : 'AGUARDANDO RETIRADA'}
                </span>
                <h3 className="font-bold text-stone-900 text-lg">{order.customer}</h3>
              </div>
              <span className="font-mono font-medium text-stone-500">{order.displayId}</span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start gap-3 text-stone-600">
                <MapPin className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm leading-tight">{order.address}</p>
              </div>
              <div className="flex items-center gap-3 text-stone-600">
                <Phone className="w-5 h-5 text-stone-400 flex-shrink-0" />
                <p className="text-sm">{order.phone}</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-stone-50 rounded-xl mb-4">
              <span className="text-xs font-bold text-stone-400 uppercase">Cobrar na entrega</span>
              <div className="text-right">
                <p className="font-bold text-stone-900">R$ {order.total.toFixed(2)}</p>
                <p className="text-xs text-stone-500">{order.payment}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => openWaze(order.address)}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50"
              >
                <Navigation className="w-4 h-4" />
                Waze
              </button>
              {order.status === 'delivering' && order.mine ? (
                <button
                  onClick={() => deliver(order)}
                  disabled={busyId === order.id}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200 disabled:opacity-60"
                >
                  {busyId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Entregue
                </button>
              ) : (
                <button
                  onClick={() => accept(order)}
                  disabled={busyId === order.id}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 shadow-lg disabled:opacity-60"
                >
                  {busyId === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
                  Pegar entrega
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

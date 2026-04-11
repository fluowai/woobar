import React from 'react';
import { MapPin, Phone, CheckCircle, Navigation } from 'lucide-react';
import { motion } from 'motion/react';

const COURIER_ORDERS = [
  {
    id: '#2018',
    customer: 'João Souza',
    address: 'Rua Bela Cintra, 200 - Consolação',
    phone: '(11) 99999-9999',
    total: 30.90,
    payment: 'Pix',
    status: 'delivering'
  },
  {
    id: '#2019',
    customer: 'Beatriz Santos',
    address: 'Rua Augusta, 500 - Cerqueira César',
    phone: '(11) 98888-8888',
    total: 108.90,
    payment: 'Cartão (Maquininha)',
    status: 'ready'
  }
];

export default function CourierView() {
  return (
    <div className="max-w-md mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h2 className="text-2xl font-bold font-display text-stone-900">Minhas Entregas</h2>
        <p className="text-stone-500">Olá, Marcos</p>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pb-20">
        {COURIER_ORDERS.map((order) => (
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
              <span className="font-mono font-medium text-stone-500">{order.id}</span>
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
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50">
                <Navigation className="w-4 h-4" />
                Waze
              </button>
              <button className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-200">
                <CheckCircle className="w-4 h-4" />
                Entregue
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

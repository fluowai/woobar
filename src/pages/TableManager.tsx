import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Coffee, CheckCircle, Clock, AlertCircle, DollarSign, X } from 'lucide-react';
import { cn } from '../lib/utils';

type TableStatus = 'free' | 'occupied' | 'reserved' | 'dirty';

interface Table {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  orders?: {
    items: number;
    total: number;
    time: string;
  };
}

const MOCK_TABLES: Table[] = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  name: `Mesa ${i + 1}`,
  seats: i % 3 === 0 ? 6 : i % 2 === 0 ? 4 : 2,
  status: i === 2 || i === 5 ? 'occupied' : i === 8 ? 'reserved' : i === 10 ? 'dirty' : 'free',
  orders: (i === 2 || i === 5) ? {
    items: i === 2 ? 4 : 12,
    total: i === 2 ? 145.50 : 480.00,
    time: i === 2 ? '25 min' : '1h 15min'
  } : undefined
}));

export default function TableManager() {
  const [tables, setTables] = useState<Table[]>(MOCK_TABLES);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const statusColors = {
    free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    occupied: 'bg-orange-100 text-orange-700 border-orange-200',
    reserved: 'bg-blue-100 text-blue-700 border-blue-200',
    dirty: 'bg-red-100 text-red-700 border-red-200'
  };

  const statusLabels = {
    free: 'Livre',
    occupied: 'Ocupada',
    reserved: 'Reservada',
    dirty: 'Limpeza'
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-stone-900">Gestão de Mesas</h1>
          <p className="text-stone-500">Mapa do salão e status em tempo real</p>
        </div>
        <div className="flex gap-4">
          {Object.entries(statusLabels).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", 
                key === 'free' ? 'bg-emerald-500' :
                key === 'occupied' ? 'bg-orange-500' :
                key === 'reserved' ? 'bg-blue-500' : 'bg-red-500'
              )} />
              <span className="text-sm text-stone-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {tables.map((table) => (
          <motion.button
            key={table.id}
            layoutId={`table-${table.id}`}
            onClick={() => setSelectedTable(table)}
            className={cn(
              "relative p-6 rounded-2xl border-2 transition-all hover:shadow-md flex flex-col items-center justify-center gap-3 aspect-square",
              statusColors[table.status],
              table.status === 'free' ? 'border-dashed' : 'border-solid'
            )}
          >
            <div className="absolute top-4 right-4 text-xs font-bold opacity-50">
              {table.seats} lug.
            </div>
            
            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center backdrop-blur-sm">
              <span className="text-2xl font-bold font-display">{table.id}</span>
            </div>

            <div className="text-center">
              <span className="text-sm font-bold uppercase tracking-wider block mb-1">
                {statusLabels[table.status]}
              </span>
              {table.status === 'occupied' && table.orders && (
                <div className="text-xs opacity-80 font-mono">
                  R$ {table.orders.total.toFixed(2)}
                </div>
              )}
            </div>

            {table.status === 'occupied' && (
              <div className="absolute bottom-4 flex items-center gap-1 text-xs font-medium bg-white/40 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {table.orders?.time}
              </div>
            )}
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {selectedTable && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedTable(null)}>
            <motion.div 
              layoutId={`table-${selectedTable.id}`}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className={cn("p-6 flex justify-between items-start", statusColors[selectedTable.status])}>
                <div>
                  <h2 className="text-3xl font-bold font-display mb-1">{selectedTable.name}</h2>
                  <p className="opacity-80 font-medium flex items-center gap-2">
                    <Users className="w-4 h-4" /> {selectedTable.seats} Lugares
                  </p>
                </div>
                <button onClick={() => setSelectedTable(null)} className="p-2 bg-white/20 hover:bg-white/40 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button className="p-4 rounded-xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-colors flex flex-col items-center gap-2">
                    <Coffee className="w-6 h-6 text-stone-600" />
                    <span className="text-sm font-bold text-stone-700">Adicionar Pedido</span>
                  </button>
                  <button className="p-4 rounded-xl bg-stone-50 border border-stone-100 hover:bg-stone-100 transition-colors flex flex-col items-center gap-2">
                    <DollarSign className="w-6 h-6 text-stone-600" />
                    <span className="text-sm font-bold text-stone-700">Fechar Conta</span>
                  </button>
                </div>

                {selectedTable.status === 'occupied' && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                    <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-400" />
                      Resumo da Mesa
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Tempo Ocupado</span>
                        <span className="font-mono font-medium">{selectedTable.orders?.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Itens Pedidos</span>
                        <span className="font-mono font-medium">{selectedTable.orders?.items}</span>
                      </div>
                      <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between text-base font-bold">
                        <span>Total Parcial</span>
                        <span>R$ {selectedTable.orders?.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedTable.status === 'free' && (
                    <button className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors">
                      Abrir Mesa
                    </button>
                  )}
                  {selectedTable.status === 'dirty' && (
                    <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors">
                      Liberar Mesa
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

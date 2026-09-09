import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Coffee, CheckCircle, Clock, AlertCircle, DollarSign, X, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import type { Table, TableStatus } from '../lib/database.types';

export default function TableManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTables = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tables')
        .select('*')
        .order('id');

      if (error) throw error;
      setTables((data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        seats: t.seats,
        status: t.status,
        orders: t.orders
      })));
    } catch (err) {
      console.error('Error fetching tables:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const updateTableStatus = async (tableId: number, newStatus: TableStatus) => {
    try {
      const updates: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (newStatus === 'free') {
        updates.orders = null;
      }

      const { error } = await supabase
        .from('tables')
        .update(updates)
        .eq('id', tableId);

      if (error) throw error;
      setTables(prev => prev.map(t => t.id === tableId ? { ...t, ...updates, status: newStatus, orders: newStatus === 'free' ? undefined : t.orders } : t));
      setSelectedTable(null);
    } catch (err) {
      console.error('Error updating table:', err);
    }
  };

  const statusColors: Record<TableStatus, string> = {
    free: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    occupied: 'bg-orange-100 text-orange-700 border-orange-200',
    reserved: 'bg-blue-100 text-blue-700 border-blue-200',
    dirty: 'bg-red-100 text-red-700 border-red-200'
  };

  const statusLabels: Record<TableStatus, string> = {
    free: 'Livre',
    occupied: 'Ocupada',
    reserved: 'Reservada',
    dirty: 'Limpeza'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold font-display text-stone-900">Gestão de Mesas</h1>
          <p className="text-stone-500">Mapa do salão e status em tempo real</p>
        </div>
        <div className="flex gap-4">
          {(Object.keys(statusLabels) as TableStatus[]).map((key) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn("w-3 h-3 rounded-full", 
                key === 'free' ? 'bg-emerald-500' :
                key === 'occupied' ? 'bg-orange-500' :
                key === 'reserved' ? 'bg-blue-500' : 'bg-red-500'
              )} />
              <span className="text-sm text-stone-600">{statusLabels[key]}</span>
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
                  R$ {Number(table.orders.total).toFixed(2)}
                </div>
              )}
            </div>

            {table.status === 'occupied' && table.orders && (
              <div className="absolute bottom-4 flex items-center gap-1 text-xs font-medium bg-white/40 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                {table.orders.time}
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
                {selectedTable.status === 'occupied' && selectedTable.orders && (
                  <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
                    <h3 className="font-bold text-stone-900 mb-3 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-stone-400" />
                      Resumo da Mesa
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-stone-500">Tempo Ocupado</span>
                        <span className="font-mono font-medium">{selectedTable.orders.time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-stone-500">Itens Pedidos</span>
                        <span className="font-mono font-medium">{selectedTable.orders.items?.length || 0}</span>
                      </div>
                      <div className="border-t border-stone-200 pt-2 mt-2 flex justify-between text-base font-bold">
                        <span>Total Parcial</span>
                        <span>R$ {Number(selectedTable.orders.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {selectedTable.status === 'free' && (
                    <button 
                      onClick={() => updateTableStatus(selectedTable.id, 'occupied')}
                      className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors"
                    >
                      Abrir Mesa
                    </button>
                  )}
                  {selectedTable.status === 'occupied' && (
                    <button 
                      onClick={() => updateTableStatus(selectedTable.id, 'dirty')}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors"
                    >
                      Fechar Conta
                    </button>
                  )}
                  {selectedTable.status === 'reserved' && (
                    <button 
                      onClick={() => updateTableStatus(selectedTable.id, 'occupied')}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                    >
                      Confirmar Reserva
                    </button>
                  )}
                  {selectedTable.status === 'dirty' && (
                    <button 
                      onClick={() => updateTableStatus(selectedTable.id, 'free')}
                      className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors"
                    >
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

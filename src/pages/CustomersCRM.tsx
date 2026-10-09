import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, Search, Star, Phone, Mail, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

export default function CustomersCRM() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    api.getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const filtered = customers.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold font-display text-stone-900">CRM — Clientes</h1>
            <p className="text-stone-500">Gestão de relacionamento e fidelidade</p>
          </div>
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar clientes..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-stone-200" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((c: any) => (
              <motion.div key={c.id} layout onClick={() => setSelected(c)}
                className={cn("bg-white p-5 rounded-2xl border shadow-sm cursor-pointer transition-all hover:shadow-md", selected?.id === c.id ? "border-orange-500 ring-2 ring-orange-200" : "border-stone-100")}>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-lg font-bold text-stone-600">
                    {c.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-lg">{c.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-stone-500">
                      <Mail className="w-3 h-3" /> {c.email || '---'}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-stone-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-stone-900">{c.total_visits}</p>
                    <p className="text-xs text-stone-500">Visitas</p>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-emerald-600">R$ {Number(c.total_spent).toFixed(0)}</p>
                    <p className="text-xs text-stone-500">Gasto Total</p>
                  </div>
                  <div className="bg-stone-50 rounded-xl p-3">
                    <div className="flex items-center justify-center gap-1 text-lg font-bold text-amber-500">
                      <Star className="w-4 h-4 fill-current" />
                      {c.loyalty_points || 0}
                    </div>
                    <p className="text-xs text-stone-500">Pontos</p>
                  </div>
                </div>
                {c.last_visit && (
                  <p className="text-xs text-stone-400 mt-3 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Última visita: {new Date(c.last_visit).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {selected && (
        <div className="w-96 bg-white rounded-2xl shadow-xl border border-stone-100 p-6 h-fit overflow-y-auto">
          <h3 className="font-bold text-lg mb-4">Detalhes do Cliente</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-xs text-stone-500">Ticket Médio</p>
                <p className="font-bold text-stone-900">
                  R$ {selected.total_visits > 0 ? (Number(selected.total_spent) / selected.total_visits).toFixed(2) : '0,00'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
              <Star className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-xs text-stone-500">Programa de Fidelidade</p>
                <p className="font-bold text-stone-900">{selected.loyalty_points || 0} pontos</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

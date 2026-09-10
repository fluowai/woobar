import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Search, MoreVertical, Globe, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Reseller } from '../../lib/database.types';

export default function ResellersList() {
  const [search, setSearch] = useState('');
  const [resellers, setResellers] = useState<Reseller[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchResellers = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('resellers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResellers((data || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        domain: r.domain,
        logo: r.logo,
        status: r.status,
        createdAt: r.created_at
      })));
    } catch (err) {
      console.error('Error fetching resellers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResellers();
  }, [fetchResellers]);

  const filteredResellers = resellers.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const { error } = await supabase
        .from('resellers')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      setResellers(prev => prev.map(r => r.id === id ? { ...r, status: newStatus as any } : r));
    } catch (err) {
      console.error('Error updating reseller status:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
            <Globe className="w-6 h-6 text-indigo-500" />
            Revendas Whitelabel (Resellers)
          </h1>
          <p className="text-stone-500 text-sm">Gerencie os donos de domínios e suas revendas.</p>
        </div>
        <button className="bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" />
          Nova Revenda
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text"
            placeholder="Buscar revenda..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-900 font-bold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Nome da Revenda</th>
                <th className="px-4 py-3">Domínio Próprio</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 rounded-r-xl">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredResellers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                    {resellers.length === 0 ? 'Nenhuma revenda cadastrada' : 'Nenhum resultado encontrado'}
                  </td>
                </tr>
              ) : (
                filteredResellers.map(reseller => (
                  <tr key={reseller.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-stone-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-indigo-500" />
                      </div>
                      {reseller.name}
                    </td>
                    <td className="px-4 py-4 font-mono text-stone-500">{reseller.domain || 'Nenhum'}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        reseller.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {reseller.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {reseller.status === 'active' ? 'Ativo' : 'Suspenso'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => handleToggleStatus(reseller.id, reseller.status)}
                        className="text-stone-400 hover:text-stone-900 p-1"
                        title={reseller.status === 'active' ? 'Suspender Revenda' : 'Ativar Revenda'}
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

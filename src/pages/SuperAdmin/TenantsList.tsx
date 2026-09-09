import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, MoreVertical, Building2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import type { Tenant } from '../../lib/database.types';

export default function TenantsList() {
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants((data || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        plan: t.plan,
        createdAt: t.created_at
      })));
    } catch (err) {
      console.error('Error fetching tenants:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    } catch (err) {
      console.error('Error updating tenant status:', err);
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
            <Building2 className="w-6 h-6 text-orange-500" />
            Restaurantes Clientes (SaaS)
          </h1>
          <p className="text-stone-500 text-sm">Gerencie todos os inquilinos cadastrados na sua plataforma.</p>
        </div>
        <button className="bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Restaurante
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <div className="relative max-w-md mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input 
            type="text"
            placeholder="Buscar restaurante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-600">
            <thead className="bg-stone-50 text-stone-900 font-bold">
              <tr>
                <th className="px-4 py-3 rounded-l-xl">Restaurante / Bar</th>
                <th className="px-4 py-3">Slug (URL)</th>
                <th className="px-4 py-3">Plano</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 rounded-r-xl">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                    {tenants.length === 0 ? 'Nenhum restaurante cadastrado' : 'Nenhum resultado encontrado'}
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr key={tenant.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                    <td className="px-4 py-4 font-bold text-stone-900 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                        <Store className="w-5 h-5 text-stone-400" />
                      </div>
                      {tenant.name}
                    </td>
                    <td className="px-4 py-4 font-mono text-stone-500">/{tenant.slug}</td>
                    <td className="px-4 py-4 uppercase text-xs font-bold tracking-wider">{tenant.plan}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {tenant.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        {tenant.status === 'active' ? 'Ativo' : 'Bloqueado'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button 
                        onClick={() => handleToggleStatus(tenant.id, tenant.status)}
                        className="text-stone-400 hover:text-stone-900 p-1"
                        title={tenant.status === 'active' ? 'Suspender Restaurante' : 'Ativar Restaurante'}
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

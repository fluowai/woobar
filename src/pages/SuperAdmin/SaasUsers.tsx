import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, Loader2, UserCheck, UserX, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../lib/database.types';

interface SaasUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  tenant_id?: string | null;
  tenant_name?: string | null;
  created_at?: string;
}

const ROLE_LABELS: Record<string, string> = {
  mega_admin: 'Mega Admin',
  super_admin: 'Super Admin',
  tenant_admin: 'Admin da Empresa',
  waiter: 'Garçom',
  kitchen: 'Cozinha',
  courier: 'Entregador',
  cashier: 'Caixa',
  manager: 'Gerente',
};

const EDITABLE_ROLES: UserRole[] = ['super_admin', 'tenant_admin', 'waiter', 'kitchen', 'courier', 'cashier', 'manager'];

export default function SaasUsers() {
  const [users, setUsers] = useState<SaasUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*, tenants(name)')
        .order('name');

      if (error) throw error;
      setUsers((data || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        tenant_id: u.tenant_id,
        tenant_name: u.tenants?.[0]?.name || u.tenants?.name || null,
        created_at: u.created_at
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Não foi possível carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user: SaasUser) => {
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
      setFeedback({ message: `${user.name}: ${newStatus === 'active' ? 'ativado' : 'desativado'}.`, type: 'success' });
    } catch (err) {
      setFeedback({ message: 'Erro ao alterar o status.', type: 'error' });
    }
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      setFeedback({ message: 'Papel atualizado com sucesso.', type: 'success' });
    } catch (err) {
      setFeedback({ message: 'Erro ao atualizar o papel.', type: 'error' });
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const activeCount = users.filter(u => u.status === 'active').length;
  const roleCounts = users.reduce<Record<string, number>>((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-orange-500" />
            Usuários SaaS
          </h1>
          <p className="text-stone-500 text-sm">Gerencie contas, papéis e status de todos os usuários da plataforma.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Total</p><p className="text-2xl font-bold font-display">{users.length}</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><UserCheck className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Ativos</p><p className="text-2xl font-bold font-display">{activeCount}</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><UserX className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Inativos</p><p className="text-2xl font-bold font-display">{users.length - activeCount}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 focus:border-stone-900"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
          >
            <option value="all">Todos os papéis</option>
            {Object.entries(roleCounts).map(([role, count]) => (
              <option key={role} value={role}>{ROLE_LABELS[role] || role} ({count})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-red-600 text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-50 text-stone-900 font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-xl">Usuário</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Restaurante</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-stone-400">Nenhum usuário encontrado</td>
                  </tr>
                ) : (
                  filteredUsers.map(user => (
                    <tr key={user.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-stone-900 text-white flex items-center justify-center text-xs font-bold">
                            {user.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{user.name}</p>
                            <p className="text-xs text-stone-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {(user.role as string) === 'mega_admin' ? (
                          <span className="uppercase text-xs font-bold tracking-wider px-2.5 py-1 rounded-full bg-stone-900 text-white">Mega Admin</span>
                        ) : (
                          <select
                            value={user.role}
                            disabled={(user.role as string) === 'mega_admin'}
                            onChange={(e) => handleChangeRole(user.id, e.target.value as UserRole)}
                            className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs font-medium focus:ring-2 focus:ring-stone-900 disabled:opacity-60"
                          >
                            {EDITABLE_ROLES.map(role => (
                              <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1.5 text-stone-500">
                          <Store className="w-3.5 h-3.5 text-stone-400" />
                          {user.tenant_name || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          user.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                        }`}>
                          {user.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
{(user.role as string) !== 'mega_admin' && (
                            <button
                              onClick={() => handleToggleStatus(user)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white ${
                                user.status === 'active' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
                              }`}
                            >
                              {user.status === 'active' ? 'Desativar' : 'Ativar'}
                            </button>
                          )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
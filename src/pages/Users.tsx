import React, { useState } from 'react';
import { 
  Users as UsersIcon, 
  Search, 
  Plus, 
  MoreVertical, 
  Shield, 
  Bike, 
  ChefHat, 
  LayoutDashboard 
} from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import type { UserRole } from '../lib/database.types';
import { cn } from '../lib/utils';

const RoleBadge = ({ role }: { role: UserRole }) => {
  const styles: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
    tenant_admin: 'bg-blue-100 text-blue-700 border-blue-200',
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    manager: 'bg-blue-100 text-blue-700 border-blue-200',
    waiter: 'bg-amber-100 text-amber-700 border-amber-200',
    kitchen: 'bg-orange-100 text-orange-700 border-orange-200',
    courier: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    cashier: 'bg-cyan-100 text-cyan-700 border-cyan-200'
  };

  const icons: Record<string, any> = {
    super_admin: Shield,
    tenant_admin: Shield,
    admin: Shield,
    manager: LayoutDashboard,
    waiter: LayoutDashboard,
    kitchen: ChefHat,
    courier: Bike,
    cashier: LayoutDashboard
  };

  const Icon = icons[role] || Shield;
  const label = role.replace(/_/g, ' ');

  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 w-fit", styles[role] || styles.admin)}>
      <Icon className="w-3 h-3" />
      {label.charAt(0).toUpperCase() + label.slice(1)}
    </span>
  );
};

export default function UsersPage() {
  const { users, loading, updateUserStatus } = useUsers();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900">Gestão de Usuários</h1>
          <p className="text-stone-500">Gerencie acesso e funções da equipe</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200">
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        <div className="p-4 border-b border-stone-100 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou email..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase font-bold">
              <tr>
                <th className="px-6 py-4 text-left">Usuário</th>
                <th className="px-6 py-4 text-left">Função</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={user.avatar || `https://i.pravatar.cc/150?u=${user.id}`} alt={user.name} className="w-10 h-10 rounded-full bg-stone-200" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold text-stone-900">{user.name}</p>
                        <p className="text-sm text-stone-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-bold",
                      user.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                    )}>
                      {user.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => updateUserStatus(user.id, user.status === 'active' ? 'inactive' : 'active')}
                      className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                      title={user.status === 'active' ? 'Desativar' : 'Ativar'}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

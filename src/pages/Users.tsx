import React, { useEffect, useState } from 'react';
import {
  Users as UsersIcon,
  Search,
  Plus,
  Pencil,
  Shield,
  ShieldCheck,
  Bike,
  ChefHat,
  ConciergeBell,
  GlassWater,
  LayoutDashboard,
  UtensilsCrossed,
  Loader2,
  type LucideIcon
} from 'lucide-react';
import { ROLE_LABELS, User, UserRole } from '../data/users';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { useAuth } from '../lib/auth';
import { cn } from '../lib/utils';

const roleStyles: Record<string, string> = {
  superadmin: 'bg-rose-100 text-rose-700 border-rose-200',
  admin: 'bg-purple-100 text-purple-700 border-purple-200',
  manager: 'bg-blue-100 text-blue-700 border-blue-200',
  waiter: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  kitchen: 'bg-orange-100 text-orange-700 border-orange-200',
  pantry: 'bg-amber-100 text-amber-700 border-amber-200',
  courier: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  attendant: 'bg-stone-100 text-stone-700 border-stone-200'
};

const roleIcons: Record<string, LucideIcon> = {
  superadmin: ShieldCheck,
  admin: Shield,
  manager: LayoutDashboard,
  waiter: UtensilsCrossed,
  kitchen: ChefHat,
  pantry: GlassWater,
  courier: Bike,
  attendant: ConciergeBell
};

const RoleBadge = ({ role }: { role: string }) => {
  const Icon = roleIcons[role] ?? Shield;
  return (
    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 w-fit", roleStyles[role] ?? 'bg-stone-100 text-stone-700 border-stone-200')}>
      <Icon className="w-3 h-3" />
      {ROLE_LABELS[role as UserRole] ?? role}
    </span>
  );
};

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  status: 'active' | 'inactive';
}

const EMPTY_FORM: UserForm = { name: '', email: '', password: '', role: 'attendant', status: 'active' };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<null | { mode: 'create' } | { mode: 'edit'; user: User }>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const { user: me } = useAuth();
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ mode: 'create' }); };
  const openEdit = (u: User) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, status: u.status || 'active' });
    setModal({ mode: 'edit', user: u });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modal) return;
    setSaving(true);
    try {
      if (modal.mode === 'create') {
        await api.createUser({ name: form.name, email: form.email, password: form.password, role: form.role });
        toast.success('Usuário criado');
      } else {
        const payload: any = { role: form.role, status: form.status };
        if (form.name.trim()) payload.name = form.name.trim();
        await api.updateUser(modal.user.id, payload);
        toast.success('Usuário atualizado');
      }
      setModal(null);
      await load();
    } catch (err) {
      toast.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (u: User) => {
    try {
      await api.updateUser(u.id, { status: u.status === 'active' ? 'inactive' : 'active' });
      setUsers(list => list.map(x => x.id === u.id ? { ...x, status: x.status === 'active' ? 'inactive' : 'active' } : x));
      toast.success('Status atualizado');
    } catch (err) {
      toast.error(err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900">Gestão de Usuários</h1>
          <p className="text-stone-500">Gerencie acesso e funções da equipe</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200">
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

        {loading ? (
          <div className="p-12 flex flex-col items-center gap-3 text-stone-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Carregando equipe...</span>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button onClick={load} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-stone-400">
            <UsersIcon className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
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
                        {user.avatar
                          ? <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full bg-stone-200" referrerPolicy="no-referrer" />
                          : <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold uppercase">{user.name.charAt(0)}</div>}
                        <div>
                          <p className="font-bold text-stone-900">{user.name}{me?.id === user.id && ' (você)'}</p>
                          <p className="text-sm text-stone-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-bold",
                        user.status === 'active' ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                      )}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(user)} title="Editar"
                          className="p-2 text-stone-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => toggleStatus(user)}
                          title={user.status === 'active' ? 'Desativar' : 'Ativar'}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-stone-200 text-stone-500 hover:bg-stone-50 transition-colors">
                          {user.status === 'active' ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setModal(null)}>
          <form onSubmit={save} onClick={e => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-stone-900">
              {modal.mode === 'create' ? 'Novo Usuário' : `Editar ${modal.user.name}`}
            </h2>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required minLength={2} />
            </div>

            {modal.mode === 'create' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-600 mb-1">Senha (mín. 8 caracteres, letras + números)</label>
                  <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    required minLength={8} />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Função</label>
              <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                {(['admin', 'manager', 'waiter', 'kitchen', 'pantry', 'courier', 'attendant'] as UserRole[]).map(r => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>

            {modal.mode === 'edit' && (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

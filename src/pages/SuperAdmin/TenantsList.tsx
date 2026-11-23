import React, { useState, useEffect, useCallback } from 'react';
import { Store, Plus, Search, Building2, CheckCircle2, XCircle, Loader2, MoreVertical, Pencil, Pause, Play, Trash2, X, CalendarDays, CreditCard, BadgeCheck, Eye, LogIn } from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../lib/supabase';
import type { Tenant } from '../../lib/database.types';

interface TenantRow extends Tenant {
  billingStatus?: 'paid' | 'pending' | 'overdue';
  dueDate?: string;
  updatedAt?: string;
}

const PLAN_LABELS: Record<string, string> = { free: 'Free', pro: 'Pro', enterprise: 'Enterprise' };
const BILLING_LABELS: Record<string, string> = { paid: 'Pago', pending: 'Pendente', overdue: 'Em atraso' };

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
      <BadgeCheck className="w-4 h-4" />
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onClose }: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="font-bold text-lg text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500 mt-2">{message}</p>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100">Cancelar</button>
          <button onClick={onConfirm} className={`px-4 py-2 rounded-xl text-sm font-bold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-stone-900 hover:bg-stone-800'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TenantsList() {
  const { impersonateTenant, isImpersonating, stopImpersonation } = useTenant();
  const [search, setSearch] = useState('');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<TenantRow | null>(null);
  const [confirmState, setConfirmState] = useState<{ id: string; name: string; status: string } | null>(null);
  const [deleteState, setDeleteState] = useState<{ id: string; name: string } | null>(null);
  const [detailTenant, setDetailTenant] = useState<TenantRow | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // form state
  const [form, setForm] = useState({ name: '', slug: '', plan: 'pro' as 'free' | 'pro' | 'enterprise', status: 'active' as 'active' | 'suspended', billingStatus: 'paid' as 'paid' | 'pending' | 'overdue' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchTenants = useCallback(async () => {
    try {
      setLoading(true);
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
        billingStatus: t.billing_status,
        dueDate: t.due_date,
        createdAt: t.created_at,
        updatedAt: t.updated_at
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching tenants:', err);
      setError('Não foi possível carregar os restaurantes. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const openCreate = () => {
    setForm({ name: '', slug: '', plan: 'pro', status: 'active', billingStatus: 'paid' });
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const slug = form.slug || slugify(form.name);
    if (!form.name || !slug) { setFormError('Informe o nome do restaurante.'); return; }
    setSaving(true);
    setFormError(null);
    try {
      const { error } = await supabase
        .from('tenants')
        .insert({ name: form.name, slug, plan: form.plan, status: form.status, billing_status: form.billingStatus });
      if (error) throw error;
      setCreateOpen(false);
      setToast({ message: 'Restaurante criado com sucesso!', type: 'success' });
      await fetchTenants();
    } catch (err: any) {
      setFormError(err?.message?.includes('duplicate') ? 'Já existe um restaurante com esse slug.' : 'Erro ao criar restaurante.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (tenant: TenantRow) => {
    setForm({ name: tenant.name, slug: tenant.slug, plan: tenant.plan, status: tenant.status, billingStatus: tenant.billingStatus || 'paid' });
    setEditTenant(tenant);
    setFormError(null);
  };

  const handleUpdate = async () => {
    if (!editTenant) return;
    setSaving(true);
    setFormError(null);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: form.name,
          slug: form.slug || slugify(form.name),
          plan: form.plan,
          status: form.status,
          billing_status: form.billingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', editTenant.id);
      if (error) throw error;
      setEditTenant(null);
      setOpenMenuId(null);
      setToast({ message: 'Restaurante atualizado com sucesso!', type: 'success' });
      await fetchTenants();
    } catch (err: any) {
      setFormError(err?.message?.includes('duplicate') ? 'Já existe um restaurante com esse slug.' : 'Erro ao atualizar restaurante.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmState) return;
    const newStatus = confirmState.status === 'active' ? 'suspended' : 'active';
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', confirmState.id);
      if (error) throw error;
      setTenants(prev => prev.map(t => t.id === confirmState.id ? { ...t, status: newStatus } : t));
      setToast({ message: newStatus === 'suspended' ? 'Restaurante suspenso.' : 'Restaurante reativado.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erro ao alterar o status do restaurante.', type: 'error' });
    } finally {
      setConfirmState(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteState) return;
    try {
      const { error } = await supabase.from('tenants').delete().eq('id', deleteState.id);
      if (error) throw error;
      setTenants(prev => prev.filter(t => t.id !== deleteState.id));
      setToast({ message: 'Restaurante excluído.', type: 'success' });
    } catch (err) {
      setToast({ message: 'Erro ao excluir restaurante.', type: 'error' });
    } finally {
      setDeleteState(null);
    }
  };

  const handleImpersonate = (tenant: TenantRow) => {
    const tenantData: Tenant = {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.plan,
      status: tenant.status,
    };
    impersonateTenant(tenantData);
    setToast({ message: `Acessando como ${tenant.name}...`, type: 'success' });
    setOpenMenuId(null);
    // Redireciona para o dashboard
    window.location.href = '/';
  };

  const filteredTenants = tenants.filter(t => t.name.toLowerCase().includes(search.toLowerCase()));
  const activeCount = tenants.filter(t => t.status === 'active').length;

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-orange-500" />
            Restaurantes Clientes (SaaS)
          </h1>
          <p className="text-stone-500 text-sm">Gerencie todos os inquilinos cadastrados na sua plataforma.</p>
        </div>
        <button onClick={openCreate} className="bg-stone-900 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-bold hover:bg-stone-800 transition-colors">
          <Plus className="w-4 h-4" />
          Novo Restaurante
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center"><Store className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Total</p><p className="text-2xl font-bold font-display">{tenants.length}</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Ativos</p><p className="text-2xl font-bold font-display">{activeCount}</p></div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-stone-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center"><XCircle className="w-5 h-5" /></div>
          <div><p className="text-xs text-stone-500">Suspensos</p><p className="text-2xl font-bold font-display">{tenants.length - activeCount}</p></div>
        </div>
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
                  <th className="px-4 py-3 rounded-l-xl">Restaurante / Bar</th>
                  <th className="hidden sm:table-cell px-4 py-3">Slug (URL)</th>
                  <th className="hidden md:table-cell px-4 py-3">Plano</th>
                  <th className="hidden lg:table-cell px-4 py-3">Cobrança</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 rounded-r-xl">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-stone-400">
                      {tenants.length === 0 ? 'Nenhum restaurante cadastrado. Clique em "Novo Restaurante".' : 'Nenhum resultado encontrado'}
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map(tenant => (
                    <tr key={tenant.id} className="border-b border-stone-50 last:border-0 hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-4 font-bold text-stone-900">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                            <Store className="w-5 h-5 text-stone-400" />
                          </div>
                          <div>
                            <p className="font-bold text-stone-900">{tenant.name}</p>
                            <p className="text-xs text-stone-400 font-normal flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString('pt-BR') : '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell px-4 py-4 font-mono text-stone-500">/{tenant.slug}</td>
                      <td className="hidden md:table-cell px-4 py-4">
                        <span className="uppercase text-xs font-bold tracking-wider px-2.5 py-1 rounded-full bg-stone-100 text-stone-700">
                          {PLAN_LABELS[tenant.plan] || tenant.plan}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          tenant.billingStatus === 'paid' ? 'bg-emerald-100 text-emerald-700'
                          : tenant.billingStatus === 'pending' ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700'
                        }`}>
                          <CreditCard className="w-3 h-3" />
                          {BILLING_LABELS[tenant.billingStatus || 'pending']}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          tenant.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {tenant.status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {tenant.status === 'active' ? 'Ativo' : 'Suspenso'}
                        </span>
                      </td>
                       <td className="px-4 py-4 relative">
                         {/* Desktop: Dropdown menu */}
                         <div className="hidden md:block">
                           <button
                             onClick={() => setOpenMenuId(openMenuId === tenant.id ? null : tenant.id)}
                             className="text-stone-400 hover:text-stone-900 p-1 rounded-lg hover:bg-stone-100"
                           >
                             <MoreVertical className="w-5 h-5" />
                           </button>
                           {openMenuId === tenant.id && (
                             <>
                               <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                               <div className="absolute right-0 top-12 z-20 w-64 bg-white rounded-2xl shadow-xl border border-stone-100 p-1.5">
                                 <button onClick={() => { setDetailTenant(tenant); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-stone-50 text-left">
                                   <Eye className="w-4 h-4 text-stone-400" /> Ver detalhes
                                 </button>
                                 <button onClick={() => { handleImpersonate(tenant); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-orange-50 text-left text-orange-700 font-medium">
                                   <LogIn className="w-4 h-4" /> Entrar como este restaurante
                                 </button>
                                 <button onClick={() => { openEdit(tenant); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-stone-50 text-left">
                                   <Pencil className="w-4 h-4 text-stone-400" /> Editar dados / plano
                                 </button>
                                 <button onClick={() => { setConfirmState({ id: tenant.id, name: tenant.name, status: tenant.status }); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm hover:bg-stone-50 text-left">
                                   {tenant.status === 'active'
                                     ? <><Pause className="w-4 h-4 text-amber-600" /> Suspender restaurante</>
                                     : <><Play className="w-4 h-4 text-emerald-600" /> Reativar restaurante</>}
                                 </button>
                                 <button onClick={() => { setDeleteState({ id: tenant.id, name: tenant.name }); setOpenMenuId(null); }} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 text-left">
                                   <Trash2 className="w-4 h-4" /> Excluir
                                 </button>
                               </div>
                             </>
                           )}
                         </div>
                         
                         {/* Mobile: Botões visíveis */}
                         <div className="md:hidden flex gap-1.5">
                           <button 
                             onClick={() => handleImpersonate(tenant)}
                             className="p-2 text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100"
                             title="Entrar como"
                           >
                             <LogIn className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => { setDetailTenant(tenant); }}
                             className="p-2 text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                             title="Ver detalhes"
                           >
                             <Eye className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => { openEdit(tenant); }}
                             className="p-2 text-stone-600 bg-stone-100 rounded-lg hover:bg-stone-200"
                             title="Editar"
                           >
                              <Pencil className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                     </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Novo / Editar modal */}
      {(createOpen || editTenant) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setCreateOpen(false); setEditTenant(null); }} />
          <div className="relative bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold font-display text-stone-900">{editTenant ? 'Editar Restaurante' : 'Novo Restaurante'}</h3>
              <button onClick={() => { setCreateOpen(false); setEditTenant(null); }} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Nome do restaurante *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })}
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Slug (URL) *</label>
                <div className="flex items-center gap-2">
                  <span className="text-stone-400 font-mono">/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Plano</label>
                  <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value as any })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900">
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900">
                    <option value="active">Ativo</option>
                    <option value="suspended">Suspenso</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Situação de cobrança</label>
                <select value={form.billingStatus} onChange={(e) => setForm({ ...form, billingStatus: e.target.value as any })} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900">
                  <option value="paid">Pago</option>
                  <option value="pending">Pendente</option>
                  <option value="overdue">Em atraso</option>
                </select>
              </div>

              {formError && <p className="text-red-600 text-sm font-medium">{formError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setCreateOpen(false); setEditTenant(null); }} className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100">Cancelar</button>
                <button
                  onClick={editTenant ? handleUpdate : handleCreate}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-sm font-bold bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editTenant ? 'Salvar alterações' : 'Criar restaurante'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detalhes modal */}
      {detailTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDetailTenant(null)} />
          <div className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-900 text-white flex items-center justify-center"><Store className="w-6 h-6" /></div>
                <div>
                  <h3 className="font-bold text-lg text-stone-900">{detailTenant.name}</h3>
                  <p className="text-sm text-stone-400 font-mono">/{detailTenant.slug}</p>
                </div>
              </div>
              <button onClick={() => setDetailTenant(null)} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-stone-50 rounded-xl p-3"><p className="text-xs text-stone-400">Plano</p><p className="font-bold uppercase">{PLAN_LABELS[detailTenant.plan]}</p></div>
              <div className="bg-stone-50 rounded-xl p-3"><p className="text-xs text-stone-400">Status</p><p className="font-bold">{detailTenant.status === 'active' ? 'Ativo' : 'Suspenso'}</p></div>
              <div className="bg-stone-50 rounded-xl p-3"><p className="text-xs text-stone-400">Cobrança</p><p className="font-bold">{BILLING_LABELS[detailTenant.billingStatus || 'pending']}</p></div>
              <div className="bg-stone-50 rounded-xl p-3"><p className="text-xs text-stone-400">ID do inquilino</p><p className="font-mono text-xs break-all">{detailTenant.id}</p></div>
              <div className="bg-stone-50 rounded-xl p-3 col-span-2"><p className="text-xs text-stone-400">Criado em</p><p className="font-bold">{detailTenant.createdAt ? new Date(detailTenant.createdAt).toLocaleString('pt-BR') : '—'}</p></div>
              <div className="bg-stone-50 rounded-xl p-3 col-span-2"><p className="text-xs text-stone-400">Última atualização</p><p className="font-bold">{detailTenant.updatedAt ? new Date(detailTenant.updatedAt).toLocaleString('pt-BR') : '—'}</p></div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.status === 'active' ? 'Suspender restaurante' : 'Reativar restaurante'}
        message={`Deseja ${confirmState?.status === 'active' ? 'suspender' : 'reativar'} "${confirmState?.name}"? Os usuários do inquilino perderão acesso enquanto suspenso.`}
        confirmLabel={confirmState?.status === 'active' ? 'Suspender' : 'Reativar'}
        danger={confirmState?.status === 'active'}
        onConfirm={handleToggleStatus}
        onClose={() => setConfirmState(null)}
      />
      <ConfirmDialog
        open={!!deleteState}
        title="Excluir restaurante"
        message={`ATENÇÃO: excluir "${deleteState?.name}" remove todos os dados do inquilino. Essa ação é irreversível.`}
        confirmLabel="Excluir"
        danger
        onConfirm={handleDelete}
        onClose={() => setDeleteState(null)}
      />
    </div>
  );
}
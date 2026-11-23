import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Building2, Users, DollarSign, Activity, Plus, Search,
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, ArrowUpRight,
  TrendingUp, RefreshCw, KeyRound, Clock, Edit2, Layers, Sparkles
} from 'lucide-react';
import { api, setToken } from '../lib/api';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  active: number;
  created_at: string;
  subscription_status: string;
  trial_ends_at: string;
  current_period_end: string;
  billing_cycle: string;
  plan_id: string;
  plan_name: string;
  plan_slug: string;
  price_monthly: number;
  user_count: number;
  table_count: number;
  product_count: number;
  order_count: number;
  admin_email: string;
  admin_name: string;
}

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  max_tables: number;
  max_users: number;
  max_products: number;
  features: string[];
  is_popular: number;
}

export default function SaasMaster() {
  const location = useLocation();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'tenants' | 'plans'>(
    location.pathname.endsWith('/planos') ? 'plans' : 'tenants'
  );

  useEffect(() => {
    setActiveTab(location.pathname.endsWith('/planos') ? 'plans' : 'tenants');
  }, [location.pathname]);

  // Modais
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState<Tenant | null>(null);

  // Formulário de Criação
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
    plan_slug: 'pro',
    trial_days: 14,
  });

  // Formulário de Edição de Plano
  const [editPlanData, setEditPlanData] = useState({
    plan_slug: '',
    status: '',
    extend_days: 0,
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [m, t, p] = await Promise.all([
        api.getSaasMetrics(),
        api.getSaasTenants(),
        api.getSaasPlans(),
      ]);
      setMetrics(m);
      setTenants(t);
      setPlans(p);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar dados do SaaS');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSaasTenant(formData);
      alert('Estabelecimento criado com sucesso!');
      setShowCreateModal(false);
      setFormData({
        name: '',
        slug: '',
        admin_name: '',
        admin_email: '',
        admin_password: '',
        plan_slug: 'pro',
        trial_days: 14,
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao criar estabelecimento');
    }
  };

  const handleToggleStatus = async (tenant: Tenant) => {
    const newActive = tenant.active ? false : true;
    const confirmMsg = newActive
      ? `Deseja reativar o estabelecimento "${tenant.name}"?`
      : `Deseja suspender/bloquear o acesso de "${tenant.name}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      await api.updateSaasTenantStatus(tenant.id, {
        active: newActive,
        subscription_status: newActive ? 'active' : 'canceled',
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status');
    }
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPlanModal) return;

    try {
      await api.updateSaasTenantPlan(showPlanModal.id, {
        plan_slug: editPlanData.plan_slug,
        status: editPlanData.status,
        extend_days: editPlanData.extend_days ? Number(editPlanData.extend_days) : undefined,
      });
      alert('Assinatura atualizada com sucesso!');
      setShowPlanModal(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Erro ao atualizar plano');
    }
  };

  const handleImpersonate = async (tenant: Tenant) => {
    if (!window.confirm(`Deseja entrar no painel como administrador de "${tenant.name}" para prestar suporte?`)) return;

    try {
      const res = await api.impersonateTenant(tenant.id);
      if (res.token) {
        setToken(res.token);
        alert(`Acessando agora o painel de ${tenant.name}. Você pode retornar ao Super Admin a qualquer momento.`);
        window.location.href = '/';
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao gerar acesso de suporte');
    }
  };

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          t.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.admin_email || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (statusFilter === 'all') return matchesSearch;
    if (statusFilter === 'active') return matchesSearch && t.active === 1 && t.subscription_status === 'active';
    if (statusFilter === 'trial') return matchesSearch && t.subscription_status === 'trial';
    if (statusFilter === 'past_due') return matchesSearch && (t.subscription_status === 'past_due' || t.active === 0);
    return matchesSearch;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-800 to-amber-950 p-8 rounded-3xl text-white shadow-xl">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Painel Master SaaS
            </span>
            <span className="text-xs text-stone-400">Woobar Multi-Tenant Core</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Gestão Global da Plataforma</h1>
          <p className="text-sm text-stone-300 mt-1">
            Controle de assinaturas, planos de venda, receita recorrente e clientes ativos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-3 bg-stone-800/80 hover:bg-stone-700 text-stone-200 rounded-2xl border border-stone-700 transition"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-stone-950 font-bold rounded-2xl shadow-lg shadow-orange-500/20 transition transform active:scale-95"
          >
            <Plus className="w-5 h-5" /> Novo Estabelecimento
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR (Recorrente)</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">
              {metrics ? `R$ ${metrics.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '...'}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> Receita mensal ativa
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total de Lojas</span>
            <div className="p-2 bg-stone-100 text-stone-700 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-stone-900">
              {metrics ? metrics.total_tenants : '...'}
            </div>
            <span className="text-[11px] text-stone-500 font-medium mt-1">Estabelecimentos no banco</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Assinantes Ativos</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-blue-600">
              {metrics ? metrics.active_tenants : '...'}
            </div>
            <span className="text-[11px] text-blue-600 font-semibold mt-1">Pagantes regulares</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Em Período Trial</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {metrics ? metrics.trial_tenants : '...'}
            </div>
            <span className="text-[11px] text-amber-600 font-semibold mt-1">Testando gratuitamente</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-stone-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">GMV (Volume 30d)</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">
              {metrics ? `R$ ${metrics.gmv_last_30_days.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : '...'}
            </div>
            <span className="text-[11px] text-purple-600 font-semibold mt-1">Transacionado em pedidos</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-stone-200 pb-3">
        <button
          onClick={() => { setActiveTab('tenants'); navigate('/mega-admin/estabelecimentos'); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === 'tenants'
              ? 'bg-stone-900 text-white shadow'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-4 h-4" /> Estabelecimentos ({tenants.length})
        </button>
        <button
          onClick={() => { setActiveTab('plans'); navigate('/mega-admin/planos'); }}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm transition ${
            activeTab === 'plans'
              ? 'bg-stone-900 text-white shadow'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Planos de Venda ({plans.length})
        </button>
      </div>

      {/* TAB 1: TENANTS LIST */}
      {activeTab === 'tenants' && (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
          {/* Controls */}
          <div className="p-5 border-b border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar por nome, slug ou e-mail..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-semibold text-stone-500">Filtrar:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Apenas Ativos</option>
                <option value="trial">Em Período de Teste</option>
                <option value="past_due">Inadimplentes / Suspensos</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-stone-600">
              <thead className="bg-stone-50 text-xs uppercase font-bold text-stone-500 tracking-wider border-b border-stone-100">
                <tr>
                  <th className="py-4 px-6">Estabelecimento</th>
                  <th className="py-4 px-6">Administrador</th>
                  <th className="py-4 px-6">Plano Atual</th>
                  <th className="py-4 px-6">Status Assinatura</th>
                  <th className="py-4 px-6">Uso da Loja</th>
                  <th className="py-4 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-stone-400">
                      Nenhum estabelecimento encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map(t => (
                    <tr key={t.id} className="hover:bg-stone-50/80 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-stone-900 flex items-center gap-2">
                          {t.name}
                          {t.active === 0 && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-md uppercase">
                              Suspenso
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-400">woobar.app/{t.slug}</div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="text-stone-900 font-semibold">{t.admin_name || 'Admin'}</div>
                        <div className="text-xs text-stone-400">{t.admin_email || '—'}</div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200/50">
                          {t.plan_name || 'Enterprise'}
                        </span>
                        <div className="text-[11px] text-stone-400 mt-0.5">
                          R$ {(t.price_monthly || 0).toFixed(2)}/mês
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {t.subscription_status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ativo
                          </span>
                        )}
                        {t.subscription_status === 'trial' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                            <Clock className="w-3.5 h-3.5" /> Trial
                          </span>
                        )}
                        {['past_due', 'canceled'].includes(t.subscription_status) && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            <XCircle className="w-3.5 h-3.5" /> Inadimplente
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3 text-xs text-stone-500">
                          <span title="Mesas">{t.table_count} mesas</span>
                          <span>•</span>
                          <span title="Produtos">{t.product_count} itens</span>
                          <span>•</span>
                          <span title="Pedidos">{t.order_count} vendas</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleImpersonate(t)}
                            className="p-2 bg-stone-100 hover:bg-stone-900 hover:text-white rounded-xl text-stone-700 font-semibold transition"
                            title="Acessar painel como Administrador da Loja (Suporte)"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setShowPlanModal(t);
                              setEditPlanData({
                                plan_slug: t.plan_slug || 'pro',
                                status: t.subscription_status || 'active',
                                extend_days: 0,
                              });
                            }}
                            className="p-2 bg-stone-100 hover:bg-stone-200 rounded-xl text-stone-700 transition"
                            title="Alterar plano ou renovar trial"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleToggleStatus(t)}
                            className={`p-2 rounded-xl transition ${
                              t.active
                                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                            title={t.active ? 'Suspender loja' : 'Reativar loja'}
                          >
                            {t.active ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PLANS CATALOG */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(p => (
            <div
              key={p.id}
              className={`bg-white rounded-3xl p-6 border relative flex flex-col justify-between ${
                p.is_popular ? 'border-orange-500 shadow-xl ring-2 ring-orange-500/20' : 'border-stone-200 shadow-sm'
              }`}
            >
              {p.is_popular === 1 && (
                <span className="absolute -top-3.5 right-6 px-3 py-1 bg-gradient-to-r from-orange-500 to-amber-500 text-stone-950 font-black text-xs rounded-full uppercase tracking-wider shadow">
                  Mais Vendido
                </span>
              )}

              <div>
                <h3 className="text-xl font-bold text-stone-900">{p.name}</h3>
                <p className="text-xs text-stone-500 mt-1 min-h-[32px]">{p.description}</p>

                <div className="my-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-stone-400">R$</span>
                    <span className="text-4xl font-black text-stone-900">{p.price_monthly.toFixed(0)}</span>
                    <span className="text-xs font-semibold text-stone-500">/mês</span>
                  </div>
                  <div className="text-xs text-emerald-600 font-bold mt-1">
                    ou R$ {p.price_yearly.toFixed(0)} anual (2 meses grátis)
                  </div>
                </div>

                <div className="space-y-3 border-t border-stone-100 pt-5 text-sm">
                  <div className="font-semibold text-stone-900 text-xs uppercase tracking-wider mb-2">
                    Limites Operacionais:
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Mesas / Comandas:</span>
                    <span className="font-bold text-stone-900">{p.max_tables >= 900 ? 'Ilimitadas' : `Até ${p.max_tables}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Garçons & Equipe:</span>
                    <span className="font-bold text-stone-900">{p.max_users >= 90 ? 'Ilimitados' : `Até ${p.max_users}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-stone-600">
                    <span>Produtos no Cardápio:</span>
                    <span className="font-bold text-stone-900">{p.max_products >= 900 ? 'Ilimitados' : `Até ${p.max_products}`}</span>
                  </div>

                  <div className="font-semibold text-stone-900 text-xs uppercase tracking-wider pt-3 mb-2">
                    Módulos Inclusos:
                  </div>
                  <ul className="space-y-2 text-xs text-stone-600">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                        <span className="capitalize">{f.replace('_', ' ')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-stone-100">
                <div className="text-center text-xs text-stone-400">
                  {tenants.filter(t => t.plan_id === p.id).length} clientes utilizam este plano
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: NOVO ESTABELECIMENTO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-stone-900 mb-1">Cadastrar Novo Estabelecimento</h2>
            <p className="text-xs text-stone-500 mb-6">Provisione um novo bar ou restaurante na plataforma instantaneamente.</p>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Nome do Estabelecimento</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Cervejaria Artesanal Madalena"
                  value={formData.name}
                  onChange={e => {
                    const name = e.target.value;
                    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                    setFormData({ ...formData, name, slug: formData.slug || slug });
                  }}
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Identificador / Slug (URL da loja)</label>
                <div className="flex items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm">
                  <span className="text-stone-400 text-xs">woobar.app/</span>
                  <input
                    type="text"
                    required
                    placeholder="cervejaria-madalena"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full bg-transparent border-none focus:outline-none text-stone-900 font-bold ml-1 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Nome do Responsável</label>
                  <input
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={formData.admin_name}
                    onChange={e => setFormData({ ...formData, admin_name: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">E-mail de Login</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@bar.com"
                    value={formData.admin_email}
                    onChange={e => setFormData({ ...formData, admin_email: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Senha Inicial de Acesso</label>
                <input
                  type="text"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={formData.admin_password}
                  onChange={e => setFormData({ ...formData, admin_password: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Plano Inicial</label>
                  <select
                    value={formData.plan_slug}
                    onChange={e => setFormData({ ...formData, plan_slug: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                  >
                    <option value="starter">Starter (R$ 97/mês)</option>
                    <option value="pro">Pro Bar & KDS (R$ 197/mês)</option>
                    <option value="enterprise">Enterprise & Fiscal (R$ 349/mês)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Dias de Teste (Trial)</label>
                  <input
                    type="number"
                    value={formData.trial_days}
                    onChange={e => setFormData({ ...formData, trial_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-stone-600 hover:bg-stone-100 font-bold text-sm rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow-lg transition"
                >
                  Criar e Liberar Acesso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ALTERAR PLANO / RENOVAÇÃO */}
      {showPlanModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-100 animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold text-stone-900 mb-1">Gerenciar Assinatura</h2>
            <p className="text-xs text-stone-500 mb-5">
              Alterar plano ou estender o prazo de <strong>{showPlanModal.name}</strong>.
            </p>

            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Novo Plano</label>
                <select
                  value={editPlanData.plan_slug}
                  onChange={e => setEditPlanData({ ...editPlanData, plan_slug: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                >
                  <option value="starter">Starter PDV (R$ 97/mês)</option>
                  <option value="pro">Pro Bar & KDS (R$ 197/mês)</option>
                  <option value="enterprise">Enterprise & Fiscal (R$ 349/mês)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Status da Assinatura</label>
                <select
                  value={editPlanData.status}
                  onChange={e => setEditPlanData({ ...editPlanData, status: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                >
                  <option value="active">Ativo (Pago)</option>
                  <option value="trial">Período de Teste (Trial)</option>
                  <option value="past_due">Inadimplente (Bloqueio suave)</option>
                  <option value="canceled">Cancelado (Suspenso)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase mb-1">Estender Período (+ Dias)</label>
                <input
                  type="number"
                  placeholder="Ex: 15 ou 30 dias adicionais"
                  value={editPlanData.extend_days || ''}
                  onChange={e => setEditPlanData({ ...editPlanData, extend_days: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(null)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 font-bold text-sm rounded-xl transition"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white font-bold text-sm rounded-xl shadow-lg transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

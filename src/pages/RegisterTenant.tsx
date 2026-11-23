import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Sparkles, CheckCircle2, ShieldCheck, ArrowRight, Store, Lock, Mail, User, Phone } from 'lucide-react';
import { api, setToken } from '../lib/api';

export default function RegisterTenant() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    establishment_name: '',
    slug: '',
    owner_name: '',
    owner_email: '',
    password: '',
    phone: '',
  });

  useEffect(() => {
    api.getSaasPlans()
      .then(res => setPlans(res))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.registerSaasTenant({
        ...formData,
        plan_slug: selectedPlan,
      });

      if (res.token) {
        setToken(res.token);
        alert('Parabéns! Seu bar/restaurante foi criado com sucesso. Você tem 14 dias grátis para testar todas as funcionalidades!');
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar cadastro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col justify-between p-4 sm:p-8">
      {/* Header */}
      <div className="max-w-5xl mx-auto w-full flex items-center justify-between pb-8 border-b border-stone-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-stone-950 font-black text-xl shadow-lg shadow-orange-500/20">
            W
          </div>
          <span className="text-2xl font-black tracking-tight text-white">Woobar<span className="text-orange-500">.</span></span>
        </div>
        <Link to="/login" className="text-sm font-bold text-stone-400 hover:text-white transition">
          Já tem conta? <span className="text-orange-400 underline">Fazer Login</span>
        </Link>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto w-full py-12 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Value Prop */}
        <div className="lg:col-span-5 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/30 rounded-full text-xs font-bold text-orange-400 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> 14 Dias Grátis • Sem Cartão
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight">
            O Sistema Operacional para seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Bar ou Restaurante</span>.
          </h1>

          <p className="text-stone-400 text-base leading-relaxed">
            Mesas, comandas, KDS de cozinha, fichas de balcão, totem de autoatendimento, estoque e DRE financeiro em uma única plataforma integrada.
          </p>

          <div className="space-y-3 pt-4 border-t border-stone-800">
            <div className="flex items-center gap-3 text-sm text-stone-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Instalação instantânea em nuvem, pronto em 2 minutos.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Garçons operam pelo próprio celular ou tablet.</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-stone-300">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>Emissão de NFC-e SEFAZ e integração com iFood.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="lg:col-span-7 bg-stone-950/80 border border-stone-800/80 p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
          <h2 className="text-2xl font-bold text-white mb-2">Crie sua Conta Gratuita</h2>
          <p className="text-xs text-stone-400 mb-6">Experimente com todos os recursos liberados durante o período de avaliação.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Seletor de Plano */}
            <div>
              <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
                Escolha o Plano Desejado:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { slug: 'starter', name: 'Starter', price: 'R$ 97' },
                  { slug: 'pro', name: 'Pro Bar', price: 'R$ 197', popular: true },
                  { slug: 'enterprise', name: 'Full Fiscal', price: 'R$ 349' },
                ].map(p => (
                  <button
                    key={p.slug}
                    type="button"
                    onClick={() => setSelectedPlan(p.slug)}
                    className={`p-3 rounded-2xl border text-center transition ${
                      selectedPlan === p.slug
                        ? 'border-orange-500 bg-orange-500/10 text-white ring-2 ring-orange-500/20'
                        : 'border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    <div className="text-xs font-bold">{p.name}</div>
                    <div className="text-sm font-black text-white mt-1">{p.price}<span className="text-[10px] font-normal text-stone-500">/m</span></div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Nome do Estabelecimento</label>
                <div className="relative">
                  <Store className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Bar do Urso"
                    value={formData.establishment_name}
                    onChange={e => {
                      const name = e.target.value;
                      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
                      setFormData({ ...formData, establishment_name: name, slug: formData.slug || slug });
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Identificador (URL)</label>
                <div className="flex items-center bg-stone-900 border border-stone-800 rounded-xl px-3 py-2 text-sm">
                  <span className="text-stone-500 text-xs">woobar.app/</span>
                  <input
                    type="text"
                    required
                    placeholder="bardo-urso"
                    value={formData.slug}
                    onChange={e => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full bg-transparent border-none focus:outline-none text-orange-400 font-bold ml-1 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Seu Nome</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    required
                    placeholder="Nome completo"
                    value={formData.owner_name}
                    onChange={e => setFormData({ ...formData, owner_name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="text"
                    placeholder="(11) 99999-8888"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">E-mail de Acesso</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="email"
                    required
                    placeholder="seu@email.com"
                    value={formData.owner_email}
                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Criar Senha</label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 dígitos"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-900 border border-stone-800 rounded-xl text-sm text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-stone-950 font-black text-base rounded-2xl shadow-xl shadow-orange-500/20 transition flex items-center justify-center gap-2 transform active:scale-98 disabled:opacity-50"
            >
              {loading ? 'Criando sua plataforma...' : 'Começar 14 Dias Grátis Agora'}
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="text-center text-[11px] text-stone-500 flex items-center justify-center gap-1 mt-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Seus dados estão protegidos com criptografia de ponta a ponta.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

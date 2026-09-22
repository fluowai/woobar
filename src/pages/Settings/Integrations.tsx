import React, { useState, useEffect } from 'react';
import { CreditCard, Save, ShieldCheck, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resolveTenantId } from '../../lib/tenant';

const GATEWAYS = [
  { id: 'asaas', name: 'Asaas', desc: 'PIX, Boleto e Cartão de Crédito', color: 'bg-blue-600' },
  { id: 'mercadopago', name: 'Mercado Pago', desc: 'Pagamentos rápidos e PIX', color: 'bg-sky-500' },
  { id: 'pagbank', name: 'PagBank', desc: 'Taxas atrativas para saldo na hora', color: 'bg-emerald-500' },
  { id: 'cielo', name: 'Cielo', desc: 'Líder em pagamentos no Brasil', color: 'bg-blue-800' },
  { id: 'rede', name: 'Rede', desc: 'Integração direta Itaú', color: 'bg-orange-500' },
  { id: 'pagarme', name: 'Pagar.me', desc: 'Alta conversão em cartão', color: 'bg-purple-600' }
];

export default function Integrations() {
  const [activeGateway, setActiveGateway] = useState('asaas');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const gateway = GATEWAYS.find(g => g.id === activeGateway);

  const loadConfig = async () => {
    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('payment_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('provider', activeGateway)
        .maybeSingle();

      if (error) throw error;
      setApiKey(data?.api_key || '');
      setApiSecret(data?.api_secret || '');
      setPixKey(data?.pix_key || '');
      setIsActive(!!data?.is_active);
    } catch (err) {
      console.error('Error loading integration:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    setFeedback(null);
    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGateway]);

  const handleSave = async () => {
    if (!apiKey.trim() && !pixKey.trim()) {
      setFeedback({ message: 'Informe ao menos o Access Token/API Key ou a chave PIX.', type: 'error' });
      return;
    }
    setSaving(true);
    setFeedback(null);
    try {
      const tenantId = await resolveTenantId();

      const { data: existing, error: findError } = await supabase
        .from('payment_integrations')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('provider', activeGateway)
        .maybeSingle();
      if (findError) throw findError;

      const payload = {
        tenant_id: tenantId,
        provider: activeGateway,
        api_key: apiKey.trim() || null,
        api_secret: apiSecret.trim() || null,
        pix_key: pixKey.trim() || null,
        is_active: isActive,
        updated_at: new Date().toISOString()
      };

      if (existing) {
        const { error } = await supabase.from('payment_integrations').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('payment_integrations').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
      }

      setFeedback({ message: `Credenciais do ${gateway?.name} salvas com sucesso!`, type: 'success' });
      setIsActive(isActive);
    } catch (err) {
      console.error('Error saving integration:', err);
      setFeedback({ message: 'Erro ao salvar as credenciais. Tente novamente.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {feedback.message}
          <button onClick={() => setFeedback(null)} className="ml-2 text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-orange-500" />
          Integrações de Pagamento
        </h1>
        <p className="text-stone-500 text-sm">Configure seus gateways para receber pagamentos via PIX ou Cartão no sistema e no delivery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {GATEWAYS.map(gw => (
          <button
            key={gw.id}
            onClick={() => setActiveGateway(gw.id)}
            className={`p-4 rounded-2xl border-2 text-left transition-all ${
              activeGateway === gw.id 
                ? 'border-orange-500 bg-orange-50' 
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className={`w-8 h-8 rounded-full ${gw.color} flex items-center justify-center text-white font-bold text-xs`}>
                {gw.name.charAt(0)}
              </div>
              {activeGateway === gw.id && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
            </div>
            <h3 className="font-bold text-stone-900">{gw.name}</h3>
            <p className="text-xs text-stone-500 mt-1">{gw.desc}</p>
          </button>
        ))}
      </div>

      {gateway && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 mt-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="font-bold text-stone-900 text-lg">Configurar {gateway.name}</h2>
              <p className="text-sm text-stone-500">As chaves inseridas aqui são criptografadas no banco de dados.</p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
            </div>
          ) : (
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleSave(); }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Access Token / API Key</label>
                  <input 
                    type="password" 
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ex: ak_live_123456789..."
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Secret Key (Opcional)</label>
                  <input 
                    type="password" 
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Ex: sk_live_987654321..."
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Chave PIX Cadastrada (Para recebimento)</label>
                <input 
                  type="text" 
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  placeholder="CNPJ, Email, Telefone ou Chave Aleatória"
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 accent-stone-900" />
                <span className="text-sm font-medium text-stone-700">Ativar este gateway para recebimentos</span>
              </label>

              <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold mb-1">Como vai funcionar na Maquininha Digital?</p>
                  <p>Ao gerar uma cobrança no terminal, o sistema criará um PIX copia e cola dinâmico usando essa integração. O dinheiro cai direto na sua conta do {gateway.name}.</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="submit" disabled={saving} className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar Credenciais
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
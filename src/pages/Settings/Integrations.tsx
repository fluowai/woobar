import React, { useState } from 'react';
import { CreditCard, Save, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Integrations() {
  const [activeGateway, setActiveGateway] = useState<string | null>('asaas');

  const gateways = [
    { id: 'asaas', name: 'Asaas', desc: 'PIX, Boleto e Cartão de Crédito', color: 'bg-blue-600' },
    { id: 'mercadopago', name: 'Mercado Pago', desc: 'Pagamentos rápidos e PIX', color: 'bg-sky-500' },
    { id: 'pagbank', name: 'PagBank', desc: 'Taxas atrativas para saldo na hora', color: 'bg-emerald-500' },
    { id: 'cielo', name: 'Cielo', desc: 'Líder em pagamentos no Brasil', color: 'bg-blue-800' },
    { id: 'rede', name: 'Rede', desc: 'Integração direta Itaú', color: 'bg-orange-500' },
    { id: 'pagarme', name: 'Pagar.me', desc: 'Alta conversão em cartão', color: 'bg-purple-600' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-orange-500" />
          Integrações de Pagamento
        </h1>
        <p className="text-stone-500 text-sm">Configure seus gateways para receber pagamentos via PIX ou Cartão no sistema e no delivery.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {gateways.map(gw => (
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

      {activeGateway && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 mt-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-stone-100">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
            <div>
              <h2 className="font-bold text-stone-900 text-lg">Configurar {gateways.find(g => g.id === activeGateway)?.name}</h2>
              <p className="text-sm text-stone-500">As chaves inseridas aqui são criptografadas no banco de dados.</p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Access Token / API Key</label>
                <input 
                  type="password" 
                  placeholder="Ex: ak_live_123456789..."
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-2">Secret Key (Opcional)</label>
                <input 
                  type="password" 
                  placeholder="Ex: sk_live_987654321..."
                  className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-stone-700 mb-2">Chave PIX Cadastrada (Para recebimento)</label>
              <input 
                type="text" 
                placeholder="CNPJ, Email, Telefone ou Chave Aleatória"
                className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex items-start gap-3 mt-4">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold mb-1">Como vai funcionar na Maquininha Digital?</p>
                <p>Ao gerar uma cobrança no terminal, o sistema criará um PIX copia e cola dinâmico usando essa integração. O dinheiro cai direto na sua conta do {gateways.find(g => g.id === activeGateway)?.name}.</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button type="button" className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800">
                <Save className="w-4 h-4" />
                Salvar Credenciais
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

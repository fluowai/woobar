import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldCheck,
  Upload,
  CheckCircle,
  AlertCircle,
  Printer,
  Download,
  XCircle,
  RefreshCw,
  Building2,
  KeyRound,
  ExternalLink
} from 'lucide-react';
import { api } from '../lib/api';
import { cn } from '../lib/utils';
import { useToast } from '../components/Toast';

export default function FiscalPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'settings' | 'invoices'>('settings');

  const defaultSettings = {
    environment: 2,
    company_name: '',
    fantasy_name: '',
    cnpj: '',
    ie: '',
    crt: 1,
    uf: 'SP',
    ibge_code: 3550308,
    city: 'São Paulo',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    zip_code: '',
    phone: '',
    csc: '',
    csc_id: '',
    cert_pfx_base64: '',
    cert_password: '',
    serie: 1,
    auto_emit_on_closing: 0,
    has_certificate: false,
  };

  const [settings, setSettings] = useState<any>(defaultSettings);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [sefazStatus, setSefazStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testingSefaz, setTestingSefaz] = useState(false);
  const [cancelModal, setCancelModal] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sett, invs] = await Promise.all([
        api.getFiscalSettings().catch(() => defaultSettings),
        api.getFiscalInvoices().catch(() => []),
      ]);
      setSettings({ ...defaultSettings, ...(sett || {}) });
      setInvoices(Array.isArray(invs) ? invs : []);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar dados fiscais');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      setSettings((prev: any) => ({ ...prev, cert_pfx_base64: base64 }));
      toast.success(`Certificado ${file.name} carregado com sucesso.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...settings,
        environment: Number(settings.environment),
        crt: Number(settings.crt),
        ibge_code: Number(settings.ibge_code),
        serie: Number(settings.serie),
        auto_emit_on_closing: settings.auto_emit_on_closing ? 1 : 0,
      };
      await api.updateFiscalSettings(payload);
      toast.success('Configurações fiscais salvas com sucesso!');
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configurações fiscais');
    } finally {
      setLoading(false);
    }
  };

  const handleTestSefaz = async () => {
    setTestingSefaz(true);
    try {
      const res = await api.checkFiscalStatus();
      setSefazStatus(res);
      if (res.status === 'ok') {
        toast.success(`SEFAZ Online: ${res.motivo || 'Serviço em operação'}`);
      } else {
        toast.error(`Status SEFAZ: ${res.motivo || res.status}`);
      }
    } catch (e: any) {
      toast.error(e.message || 'Falha ao consultar SEFAZ');
      setSefazStatus({ status: 'erro', motivo: e.message });
    } finally {
      setTestingSefaz(false);
    }
  };

  const handlePrintDanfe = async (id: string) => {
    try {
      await api.printFiscalInvoice(id);
      toast.success('DANFE NFC-e enviada para a fila de impressão!');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao imprimir comprovante');
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModal) return;
    if (cancelReason.length < 15) {
      toast.error('A justificativa deve ter no mínimo 15 caracteres (exigência SEFAZ).');
      return;
    }
    setCancelling(true);
    try {
      await api.cancelNfce(cancelModal.id, cancelReason);
      toast.success('NFC-e cancelada com sucesso junto à SEFAZ!');
      setCancelModal(null);
      setCancelReason('');
      await loadData();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao cancelar NFC-e');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-orange-600 text-sm font-bold">
            <FileText className="w-4 h-4" />
            MÓDULO FISCAL NFC-e (MODELO 65)
          </div>
          <h1 className="text-3xl font-bold mt-1 text-stone-900">Emissão Fiscal & SEFAZ</h1>
          <p className="text-stone-500">
            Gerencie certificado digital A1, dados do emitente e emissão automática de NFC-e.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all',
              activeTab === 'settings' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
            )}
          >
            Configurações & Certificado
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={cn(
              'px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2',
              activeTab === 'invoices' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-900'
            )}
          >
            Notas Emitidas
            {invoices.length > 0 && (
              <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                {invoices.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SEFAZ Status Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center font-bold',
              sefazStatus?.status === 'ok'
                ? 'bg-emerald-100 text-emerald-700'
                : sefazStatus?.status === 'unconfigured'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-stone-100 text-stone-500'
            )}
          >
            {sefazStatus?.status === 'ok' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            ) : sefazStatus?.status === 'unconfigured' ? (
              <AlertCircle className="w-5 h-5 text-amber-600" />
            ) : (
              <Building2 className="w-5 h-5 text-stone-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-stone-900">Status SEFAZ ({settings.uf || 'SP'})</span>
              <span
                className={cn(
                  'text-xs px-2.5 py-0.5 rounded-full font-bold',
                  settings.environment === 1
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                )}
              >
                {settings.environment === 1 ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO'}
              </span>
            </div>
            <p className="text-xs text-stone-500">
              {sefazStatus?.motivo || 'Clique em "Testar Conexão" para verificar disponibilidade na SEFAZ estadual.'}
            </p>
          </div>
        </div>

        <button
          onClick={handleTestSefaz}
          disabled={testingSefaz}
          className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn('w-4 h-4', testingSefaz && 'animate-spin')} />
          {testingSefaz ? 'Verificando...' : 'Testar Conexão SEFAZ'}
        </button>
      </div>

      {activeTab === 'settings' ? (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dados da Empresa Emitente */}
            <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                <Building2 className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-lg text-stone-900">Dados do Emitente</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block col-span-2">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Razão Social *</span>
                  <input
                    required
                    value={settings.company_name || ''}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="BAR E RESTAURANTE EXEMPLO LTDA"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block col-span-2">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Nome Fantasia</span>
                  <input
                    value={settings.fantasy_name || ''}
                    onChange={(e) => setSettings({ ...settings, fantasy_name: e.target.value })}
                    placeholder="WOOBAR"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">CNPJ *</span>
                  <input
                    required
                    value={settings.cnpj || ''}
                    onChange={(e) => setSettings({ ...settings, cnpj: e.target.value })}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Inscrição Estadual (IE) *</span>
                  <input
                    required
                    value={settings.ie || ''}
                    onChange={(e) => setSettings({ ...settings, ie: e.target.value })}
                    placeholder="123456789"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Regime Tributário (CRT) *</span>
                  <select
                    value={settings.crt || 1}
                    onChange={(e) => setSettings({ ...settings, crt: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm bg-white"
                  >
                    <option value={1}>1 - Simples Nacional</option>
                    <option value={2}>2 - Simples (Excesso Sublimite)</option>
                    <option value={3}>3 - Regime Normal (Lucro Presumido/Real)</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Estado (UF) *</span>
                  <input
                    required
                    maxLength={2}
                    value={settings.uf || 'SP'}
                    onChange={(e) => setSettings({ ...settings, uf: e.target.value.toUpperCase() })}
                    placeholder="SP"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm uppercase"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Código IBGE Município *</span>
                  <input
                    required
                    type="number"
                    value={settings.ibge_code || 3550308}
                    onChange={(e) => setSettings({ ...settings, ibge_code: Number(e.target.value) })}
                    placeholder="3550308"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Cidade *</span>
                  <input
                    required
                    value={settings.city || ''}
                    onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                    placeholder="São Paulo"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block col-span-2">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Logradouro / Rua *</span>
                  <input
                    required
                    value={settings.street || ''}
                    onChange={(e) => setSettings({ ...settings, street: e.target.value })}
                    placeholder="Avenida Paulista"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Número *</span>
                  <input
                    required
                    value={settings.number || ''}
                    onChange={(e) => setSettings({ ...settings, number: e.target.value })}
                    placeholder="1000"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Bairro *</span>
                  <input
                    required
                    value={settings.neighborhood || ''}
                    onChange={(e) => setSettings({ ...settings, neighborhood: e.target.value })}
                    placeholder="Bela Vista"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">CEP *</span>
                  <input
                    required
                    value={settings.zip_code || ''}
                    onChange={(e) => setSettings({ ...settings, zip_code: e.target.value })}
                    placeholder="01310-100"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Telefone</span>
                  <input
                    value={settings.phone || ''}
                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                    placeholder="1199999999"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>
              </div>
            </section>

            {/* Certificado Digital A1 & SEFAZ */}
            <section className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                <ShieldCheck className="w-5 h-5 text-orange-500" />
                <h2 className="font-bold text-lg text-stone-900">Certificado A1 & SEFAZ</h2>
              </div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Ambiente de Emissão *</span>
                  <select
                    value={settings.environment || 2}
                    onChange={(e) => setSettings({ ...settings, environment: Number(e.target.value) })}
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm bg-white font-bold"
                  >
                    <option value={2}>2 - Homologação (Testes / Sem valor jurídico)</option>
                    <option value={1}>1 - Produção (Vendas Reais / Válido na SEFAZ)</option>
                  </select>
                </label>

                {/* Upload Certificado A1 */}
                <div className="border-2 border-dashed border-stone-200 rounded-2xl p-4 text-center hover:border-orange-400 transition-colors">
                  <KeyRound className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-stone-800">
                    {settings.has_certificate ? 'Certificado A1 Configurado' : 'Carregar Certificado Digital A1'}
                  </p>
                  <p className="text-xs text-stone-400 mb-3">
                    Arquivo .pfx ou .p12 (padrão ICP-Brasil)
                  </p>
                  <label className="cursor-pointer px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold inline-flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" />
                    Selecionar Arquivo .PFX
                    <input type="file" accept=".pfx,.p12" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-bold text-stone-500 block mb-1">Senha do Certificado Digital</span>
                  <input
                    type="password"
                    value={settings.cert_password || ''}
                    onChange={(e) => setSettings({ ...settings, cert_password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-bold text-stone-500 block mb-1">Token CSC (SEFAZ) *</span>
                    <input
                      required
                      value={settings.csc || ''}
                      onChange={(e) => setSettings({ ...settings, csc: e.target.value })}
                      placeholder="Ex: A1B2C3D4E5F6..."
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-stone-500 block mb-1">ID do CSC (CSC-ID) *</span>
                    <input
                      required
                      value={settings.csc_id || ''}
                      onChange={(e) => setSettings({ ...settings, csc_id: e.target.value })}
                      placeholder="Ex: 000001"
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-stone-500 block mb-1">Série da NFC-e *</span>
                    <input
                      type="number"
                      value={settings.serie || 1}
                      onChange={(e) => setSettings({ ...settings, serie: Number(e.target.value) })}
                      className="w-full px-3 py-2 border rounded-xl outline-none focus:border-orange-500 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-stone-500 block mb-1">Último Número Emitido</span>
                    <input
                      disabled
                      value={settings.last_number || 0}
                      className="w-full px-3 py-2 border rounded-xl bg-stone-50 text-stone-500 text-sm"
                    />
                  </label>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(settings.auto_emit_on_closing)}
                      onChange={(e) => setSettings({ ...settings, auto_emit_on_closing: e.target.checked ? 1 : 0 })}
                      className="w-4 h-4 text-orange-500 rounded"
                    />
                    <span className="text-xs font-bold text-stone-700">
                      Emitir NFC-e automaticamente ao fechar mesa ou pedido
                    </span>
                  </label>
                </div>
              </div>
            </section>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Salvar Configurações Fiscais'}
            </button>
          </div>
        </form>
      ) : (
        /* Aba de Notas Emitidas */
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-stone-100 flex items-center justify-between">
            <h2 className="font-bold text-lg text-stone-900">Histórico de Notas Fiscais</h2>
            <button
              onClick={loadData}
              className="p-2 hover:bg-stone-100 rounded-xl text-stone-500 transition-colors"
              title="Atualizar lista"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200 text-xs font-bold text-stone-500 uppercase">
                  <th className="py-3 px-4">Número / Série</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Destinatário</th>
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Chave de Acesso</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-sm">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-stone-400">
                      Nenhuma nota fiscal emitida até o momento.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-stone-50 transition-colors">
                      <td className="py-3 px-4 font-bold">
                        #{inv.number} / {inv.serie}
                      </td>
                      <td className="py-3 px-4 text-stone-500 text-xs">
                        {inv.created_at ? new Date(`${inv.created_at}Z`).toLocaleString('pt-BR') : '---'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-stone-900">{inv.customer_name || 'CONSUMIDOR'}</div>
                        {inv.customer_cpf && (
                          <div className="text-xs text-stone-400">CPF: {inv.customer_cpf}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-stone-900">
                        R$ {Number(inv.total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-full text-xs font-bold',
                            inv.status === 'autorizada'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'cancelada'
                              ? 'bg-stone-100 text-stone-500 line-through'
                              : 'bg-red-100 text-red-700'
                          )}
                        >
                          {inv.status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-stone-500">
                        {inv.ch_nfe ? (
                          <span title={inv.ch_nfe}>
                            {inv.ch_nfe.slice(0, 8)}...{inv.ch_nfe.slice(-6)}
                          </span>
                        ) : (
                          '---'
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'autorizada' && (
                            <>
                              <button
                                onClick={() => handlePrintDanfe(inv.id)}
                                title="Imprimir Cupom DANFE"
                                className="p-2 hover:bg-stone-100 rounded-lg text-stone-700 transition-colors"
                              >
                                <Printer className="w-4 h-4" />
                              </button>
                              <a
                                href={api.getFiscalXmlUrl(inv.id)}
                                download
                                title="Baixar XML Protocolado"
                                className="p-2 hover:bg-stone-100 rounded-lg text-stone-700 transition-colors"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                              <button
                                onClick={() => {
                                  setCancelModal(inv);
                                  setCancelReason('');
                                }}
                                title="Cancelar NFC-e"
                                className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
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

      {/* Modal de Cancelamento de NFC-e */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle className="w-6 h-6" />
              <h3 className="font-bold text-lg text-stone-900">Cancelar NFC-e #{cancelModal.number}</h3>
            </div>
            <p className="text-sm text-stone-600">
              O cancelamento junto à SEFAZ é irreversível e exige justificativa formal com no mínimo 15 caracteres.
            </p>
            <div>
              <span className="text-xs font-bold text-stone-500 block mb-1">
                Justificativa do Cancelamento *
              </span>
              <textarea
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Exemplo: Venda cancelada pelo cliente por desacordo no pedido..."
                className="w-full p-3 border rounded-xl text-sm outline-none focus:border-red-500"
              />
              <span className="text-xs text-stone-400 block mt-1">
                {cancelReason.length}/15 caracteres mínimos
              </span>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="px-4 py-2 border rounded-xl text-sm font-bold text-stone-600 hover:bg-stone-100"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling || cancelReason.length < 15}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

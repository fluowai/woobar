import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, Smartphone, ShoppingBag, CheckCircle, XCircle,
  ExternalLink, Wifi, WifiOff, Plus, Trash2, Settings,
  RefreshCw, ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

const CHANNEL_ICONS: Record<string, any> = {
  website: Globe,
  ifood: ShoppingBag,
  uber: ShoppingBag,
  rappi: ShoppingBag,
  food99: ShoppingBag,
  whatsapp: Smartphone,
  facebook: Globe,
  instagram: Smartphone,
};

const CHANNEL_COLORS: Record<string, string> = {
  website: 'bg-blue-100 text-blue-600',
  ifood: 'bg-red-100 text-red-600',
  uber: 'bg-green-100 text-green-600',
  rappi: 'bg-orange-100 text-orange-600',
  food99: 'bg-amber-100 text-amber-700',
  whatsapp: 'bg-emerald-100 text-emerald-600',
  facebook: 'bg-indigo-100 text-indigo-600',
  instagram: 'bg-pink-100 text-pink-600',
};

const CHANNEL_NAMES: Record<string, string> = {
  ifood: 'iFood',
  uber: 'Uber Eats',
  rappi: 'Rappi',
  food99: '99Food',
  whatsapp: 'WhatsApp',
  website: 'Site',
  facebook: 'Facebook',
  instagram: 'Instagram',
};

const CHANNEL_CONFIG_FIELDS: Record<string, any[]> = {
  ifood: [
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Seu Client ID iFood' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Seu Client Secret iFood' },
    { key: 'merchant_id', label: 'Merchant ID', type: 'text', placeholder: 'ID do seu restaurante no iFood' },
  ],
  uber: [
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Seu Client ID Uber' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Seu Client Secret Uber' },
    { key: 'merchant_uuid', label: 'Merchant UUID', type: 'text', placeholder: 'UUID do seu restaurante no Uber' },
    { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'ID da loja no Uber Eats' },
  ],
  rappi: [
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Seu Client ID Rappi' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Seu Client Secret Rappi' },
    { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'ID da loja na Rappi' },
    { key: 'auth_url', label: 'URL de Autenticação', type: 'text', placeholder: 'https://api.rappi.com.br/restaurants/auth/v1/token/login/integrations' },
    { key: 'api_url', label: 'URL da API', type: 'text', placeholder: 'https://services.rappi.com.br' },
  ],
  food99: [
    { key: 'client_id', label: 'Client ID', type: 'text', placeholder: 'Seu Client ID 99Food' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: 'Seu Client Secret 99Food' },
    { key: 'store_id', label: 'Store ID', type: 'text', placeholder: 'ID da loja na 99Food' },
    { key: 'auth_url', label: 'URL de Autenticação', type: 'text', placeholder: 'https://api.99app.com/...' },
    { key: 'api_url', label: 'URL da API', type: 'text', placeholder: 'https://api.99app.com/...' },
  ],
  whatsapp: [
    { key: 'phone_number_id', label: 'Phone Number ID', type: 'text', placeholder: 'ID do número do WhatsApp' },
    { key: 'verify_token', label: 'Verify Token', type: 'text', placeholder: 'Token de verificação do webhook' },
  ],
};

const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/+$/, '');

export default function Channels() {
  const [channels, setChannels] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'ifood' });
  const [configForms, setConfigForms] = useState<Record<string, any>>({});
  const [showConfig, setShowConfig] = useState<Record<string, boolean>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const toast = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const [chs, ords, evts] = await Promise.all([
        api.getChannels(),
        api.getChannelOrders(),
        api.getChannelEvents(),
      ]);
      setChannels(Array.isArray(chs) ? chs : []);
      setOrders(Array.isArray(ords) ? ords : []);
      setEvents(Array.isArray(evts) ? evts : []);
    } catch (e: any) {
      setLoadError(e.message || 'Falha ao carregar canais');
    } finally {
      setLoading(false);
    }
  }

  const toggle = async (id: string) => {
    try {
      await api.toggleChannel(id);
      setChannels(prev => prev.map(c => c.id === id ? { ...c, active: c.active ? 0 : 1 } : c));
    } catch (e) {
      toast.error(e);
    }
  };

  const createChannel = async () => {
    if (!newChannel.name) return;
    try {
      const result = await api.createChannel(newChannel);
      setChannels(prev => [...prev, { ...result, active: 0, config_json: '{}' }]);
      setShowNewForm(false);
      setNewChannel({ name: '', type: 'ifood' });
      toast.success('Canal criado');
    } catch (e) {
      toast.error(e);
    }
  };

  const deleteChannel = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este canal?')) return;
    try {
      await api.deleteChannel(id);
      setChannels(prev => prev.filter(c => c.id !== id));
      toast.success('Canal excluído');
    } catch (e) {
      toast.error(e);
    }
  };

  const saveConfig = async (channelId: string) => {
    setSaving(channelId);
    try {
      const config = configForms[channelId] || {};
      await api.updateChannel(channelId, { config_json: config });
      toast.success('Configuração salva');
    } catch (e) {
      toast.error(e);
    }
    setSaving(null);
  };

  const saveApiKey = async (channelId: string, value: string) => {
    try {
      await api.updateChannel(channelId, { api_key: value });
    } catch (e) {
      toast.error(e);
    }
  };

  const getWebhookUrl = (ch: any) => {
    if (ch.type === 'ifood') return `${PUBLIC_BASE}/api/channels/webhook/ifood/${ch.id}`;
    if (ch.type === 'uber') return `${PUBLIC_BASE}/api/channels/webhook/uber/${ch.id}`;
    if (ch.type === 'rappi') return `${PUBLIC_BASE}/api/channels/webhook/rappi/${ch.id}`;
    if (ch.type === 'food99') return `${PUBLIC_BASE}/api/channels/webhook/food99/${ch.id}`;
    if (ch.type === 'whatsapp') return `${PUBLIC_BASE}/api/channels/webhook/whatsapp/${ch.id}`;
    return `${PUBLIC_BASE}/api/channels/webhook/${ch.type}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-stone-900">Marketplace de Canais</h1>
          <p className="text-stone-500">Gerencie integrações com plataformas de entrega</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl hover:bg-stone-200 transition-colors">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors shadow-lg">
            <Plus className="w-4 h-4" /> Novo Canal
          </button>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-8 rounded-2xl border border-stone-100 text-center text-stone-400 text-sm">
            Carregando canais...
          </motion.div>
        )}
        {!loading && loadError && (
          <div className="bg-white p-8 rounded-2xl border border-red-100 text-center">
            <p className="text-sm text-red-600 mb-4">{loadError}</p>
            <button onClick={loadData} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
          </div>
        )}
        {!loading && !loadError && channels.length === 0 && !showNewForm && (
          <div className="bg-white p-8 rounded-2xl border border-stone-100 text-center text-stone-400 text-sm">
            Nenhum canal configurado. Clique em "Novo Canal" para começar.
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white p-6 rounded-2xl border-2 border-orange-200 shadow-sm overflow-hidden">
            <h3 className="font-bold text-stone-900 mb-4">Novo Canal de Integração</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Nome do Canal</label>
                <input type="text" value={newChannel.name} onChange={e => setNewChannel(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: iFood Matriz" className="w-full px-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Plataforma</label>
                <select value={newChannel.type} onChange={e => setNewChannel(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
                  {Object.entries(CHANNEL_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <button onClick={createChannel} className="px-6 py-2 bg-stone-900 text-white rounded-xl hover:bg-stone-800 transition-colors">Criar</button>
                <button onClick={() => setShowNewForm(false)} className="px-4 py-2 bg-stone-100 text-stone-600 rounded-xl hover:bg-stone-200 transition-colors">Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {channels.map(ch => {
          const Icon = CHANNEL_ICONS[ch.type] || Globe;
          const color = CHANNEL_COLORS[ch.type] || 'bg-stone-100 text-stone-600';
          const config = typeof ch.config_json === 'string' ? JSON.parse(ch.config_json || '{}') : (ch.config_json || {});
          const isOpen = showConfig[ch.id];

          return (
            <motion.div key={ch.id} layout className={cn("bg-white p-6 rounded-2xl border-2 shadow-sm transition-all", ch.active ? "border-emerald-200" : "border-stone-200 opacity-70")}>
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-3 rounded-xl", color)}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowConfig(p => ({ ...p, [ch.id]: !p[ch.id] }))}
                    className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                    <Settings className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggle(ch.id)}
                    className={cn("flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold", ch.active ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500")}>
                    {ch.active ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {ch.active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
              </div>
              <h3 className="font-bold text-stone-900 text-lg">{ch.name}</h3>
              <p className="text-sm text-stone-500 capitalize">{CHANNEL_NAMES[ch.type] || ch.type}</p>

              <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Webhook URL</p>
                <div className="flex gap-1">
                  <code className="flex-1 text-xs text-stone-700 truncate bg-white px-2 py-1 rounded border border-stone-200">{getWebhookUrl(ch)}</code>
                  <button onClick={() => copyToClipboard(getWebhookUrl(ch))}
                    className="text-xs text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap">Copiar</button>
                </div>
              </div>

              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mt-4 pt-4 border-t border-stone-100 overflow-hidden">
                    {CHANNEL_CONFIG_FIELDS[ch.type]?.map(field => {
                      const val = config[field.key] || '';
                      const isSecret = showSecrets[`${ch.id}-${field.key}`];
                      return (
                        <div key={field.key} className="mb-3">
                          <label className="block text-xs font-medium text-stone-600 mb-1">{field.label}</label>
                          <div className="relative">
                            <input type={field.type === 'password' && !isSecret ? 'password' : 'text'}
                              value={val}
                              onChange={e => setConfigForms(p => ({ ...p, [ch.id]: { ...(p[ch.id] || config), [field.key]: e.target.value } }))}
                              placeholder={field.placeholder}
                              className="w-full px-3 py-2 text-sm rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 pr-8" />
                            {field.type === 'password' && (
                              <button onClick={() => setShowSecrets(p => ({ ...p, [`${ch.id}-${field.key}`]: !p[`${ch.id}-${field.key}`] }))}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                                {isSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {ch.type === 'whatsapp' && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-stone-600 mb-1">API Key (Token de Acesso)</label>
                        <input type="text" value={ch.api_key || ''}
                          onBlur={e => { if (e.target.value !== (ch.api_key || '')) saveApiKey(ch.id, e.target.value); }}
                          placeholder="Token de acesso do WhatsApp Cloud API"
                          className="w-full px-3 py-2 text-sm rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20" />
                      </div>
                    )}

                    <div className="flex gap-2 mt-4">
                      <button onClick={() => saveConfig(ch.id)}
                        disabled={saving === ch.id}
                        className="flex-1 py-2 bg-stone-900 text-white text-sm rounded-xl hover:bg-stone-800 disabled:opacity-50 transition-colors">
                        {saving === ch.id ? 'Salvando...' : 'Salvar Configuração'}
                      </button>
                      <button onClick={() => deleteChannel(ch.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="font-bold text-lg text-stone-900 mb-4">Pedidos de Canais Externos</h3>
          {orders.length === 0 ? (
            <p className="text-stone-400 text-center py-8">Nenhum pedido de canal externo ainda</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((o: any) => (
                <div key={o.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div>
                    <span className="font-bold text-stone-900">{o.channel_name}</span>
                    <span className="text-xs text-stone-500 ml-2">#{o.external_id?.slice(0, 8)}</span>
                    <p className="text-xs text-stone-400 mt-1">{new Date(o.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <span className={cn("px-2 py-1 rounded text-xs font-bold",
                    o.status === 'received' ? "bg-blue-100 text-blue-700" :
                    o.status === 'accepted' ? "bg-indigo-100 text-indigo-700" :
                    o.status === 'preparing' ? "bg-yellow-100 text-yellow-700" :
                    o.status === 'ready' ? "bg-green-100 text-green-700" :
                    o.status === 'delivered' ? "bg-emerald-100 text-emerald-700" :
                    o.status === 'cancelled' ? "bg-red-100 text-red-700" :
                    "bg-stone-100 text-stone-600")}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">
          <h3 className="font-bold text-lg text-stone-900 mb-4">Eventos de Integração</h3>
          {events.length === 0 ? (
            <p className="text-stone-400 text-center py-8">Nenhum evento registrado</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((e: any) => (
                <div key={e.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2 h-2 rounded-full", e.processed ? "bg-emerald-500" : "bg-yellow-500")} />
                    <div>
                      <span className="text-sm font-medium text-stone-900">{e.channel_name}</span>
                      <span className="text-xs text-stone-500 ml-2">{e.event_type}</span>
                      <p className="text-xs text-stone-400">{new Date(e.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

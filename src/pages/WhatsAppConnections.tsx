import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, MessageCircle, Plus, RefreshCw, Trash2, Wifi, WifiOff } from 'lucide-react';
import { whatsappConnections, api } from '../lib/api';

type Connection = { id: string; display_name: string; session_name: string; base_url: string; category_id?: string | null; active: number; };

export default function WhatsAppConnections() {
  const [items, setItems] = useState<Connection[]>([]); const [contacts, setContacts] = useState<Record<string, any[]>>({}); const [editing, setEditing] = useState<Record<string, string>>({});
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({ display_name: '', session_name: '', base_url: 'http://waha:3000', api_key: '', category_id: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [status, setStatus] = useState<Record<string, any>>({});
  const load = async () => { try { setItems(await whatsappConnections.list()); setCategories(await api.getCategories()); } catch (e: any) { setError(e.message); } };
  useEffect(() => { load(); }, []);
  const create = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(''); try { await whatsappConnections.create({ ...form, category_id: form.category_id || null }); setForm({ display_name: '', session_name: '', base_url: 'http://waha:3000', api_key: '', category_id: '' }); await load(); } catch (e: any) { setError(e.message); } finally { setBusy(false); } };
  const refresh = async (id: string) => { try { const value = await whatsappConnections.status(id); setStatus(s => ({ ...s, [id]: value })); } catch (e: any) { setError(e.message); } };
  const loadContacts = async (id: string) => { try { const value = await whatsappConnections.contacts(id); setContacts(s => ({ ...s, [id]: value })); } catch (e: any) { setError(e.message); } };
  const saveContact = async (id: string, phone: string) => { await whatsappConnections.updateContact(id, phone, editing[`${id}:${phone}`] || ''); await loadContacts(id); };
  const remove = async (id: string) => { if (!confirm('Excluir esta conexão e a sessão WAHA?')) return; await whatsappConnections.remove(id); await load(); };
  return <div className="max-w-5xl mx-auto space-y-6">
    <div><h1 className="text-2xl font-bold text-stone-900">Conexões WhatsApp</h1><p className="text-sm text-stone-500 mt-1">Gerencie instâncias WAHA e escolha o catálogo que a IA poderá consultar.</p></div>
    <form onSubmit={create} className="bg-white border border-stone-200 rounded-2xl p-5 grid md:grid-cols-2 gap-4">
      <input required placeholder="Nome da conexão (ex.: WhatsApp Loja)" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className="input" />
      <input required pattern="[A-Za-z0-9_-]+" placeholder="Nome da instância WAHA (obrigatório)" value={form.session_name} onChange={e => setForm({ ...form, session_name: e.target.value })} className="input" />
      <input required type="url" placeholder="URL do WAHA" value={form.base_url} onChange={e => setForm({ ...form, base_url: e.target.value })} className="input" />
      <input type="password" placeholder="API key do WAHA (opcional)" value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} className="input" />
      <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="input"><option value="">Vincular todo o cardápio</option>{categories.map(c => <option key={c.id} value={c.id}>Somente: {c.name}</option>)}</select>
      <button disabled={busy} className="bg-emerald-600 text-white rounded-xl px-4 py-3 font-semibold flex items-center justify-center gap-2">{busy ? <Loader2 className="animate-spin" /> : <Plus className="w-4 h-4" />} Criar conexão</button>
      {error && <p className="md:col-span-2 text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}
    </form>
    <div className="space-y-3">{items.map(c => <div key={c.id} className="bg-white border border-stone-200 rounded-2xl p-5 flex flex-wrap items-center gap-4"><div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><MessageCircle /></div><div className="flex-1 min-w-[220px]"><h2 className="font-semibold text-stone-900">{c.display_name}</h2><p className="text-xs text-stone-500">Instância: <code>{c.session_name}</code> · {c.category_id ? 'Cardápio por categoria' : 'Cardápio completo'}</p></div><div className="text-sm">{status[c.id]?.status ? <span className="text-emerald-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> {status[c.id].status}</span> : <span className="text-stone-400 flex items-center gap-1"><WifiOff className="w-4 h-4" /> Não consultado</span>}</div><button onClick={() => refresh(c.id)} className="p-2 rounded-lg hover:bg-stone-100" title="Atualizar status"><RefreshCw className="w-4 h-4" /></button><button onClick={() => loadContacts(c.id)} className="text-xs px-3 py-2 rounded-lg bg-stone-100 hover:bg-stone-200">Contatos</button><button onClick={() => remove(c.id)} className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Excluir"><Trash2 className="w-4 h-4" /></button>{contacts[c.id] && <div className="w-full border-t pt-3 space-y-2"><p className="text-xs text-stone-500">Corrija o nome quando o WhatsApp não enviar pushName:</p>{contacts[c.id].map(contact => <div key={contact.phone} className="flex gap-2 items-center"><span className="text-xs text-stone-500 w-32">{contact.phone}</span><input className="input flex-1" value={editing[`${c.id}:${contact.phone}`] ?? contact.display_name} onChange={e => setEditing(s => ({ ...s, [`${c.id}:${contact.phone}`]: e.target.value }))} /><button onClick={() => saveContact(c.id, contact.phone)} className="text-xs px-3 py-2 bg-emerald-600 text-white rounded-lg">Salvar</button></div>)}</div>}</div>)}{!items.length && <div className="text-center py-12 text-stone-400">Nenhuma conexão WAHA configurada.</div>}</div>
  </div>;
}

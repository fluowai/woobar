import { useEffect, useState } from 'react';
import { MessageSquare, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';

type Ticket = { id: string; subject: string; description: string; status: string; priority: string; establishment_name: string; requester_name: string; requester_email: string; updated_at: string; message_count: number };
type Message = { id: string; body: string; user_name: string; user_role: string; created_at: string; internal: number };

const statusLabels: Record<string, string> = { open: 'Aberto', in_progress: 'Em atendimento', waiting_customer: 'Aguardando cliente', resolved: 'Resolvido', closed: 'Fechado' };

export default function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const load = async () => { setLoading(true); try { const data = await api.getSupportTickets(status); setTickets(data); if (selected) setMessages(await api.getSupportMessages(selected.id)); } finally { setLoading(false); } };
  useEffect(() => { load(); }, [status]);
  const select = async (ticket: Ticket) => { setSelected(ticket); setMessages(await api.getSupportMessages(ticket.id)); };
  const send = async () => { if (!selected || !reply.trim()) return; await api.addSupportMessage(selected.id, { body: reply, status: 'in_progress' }); setReply(''); await load(); };
  return <div className="p-6 max-w-7xl mx-auto space-y-6">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">Operação e suporte</p><h1 className="text-3xl font-black text-slate-900">Central de atendimento</h1><p className="text-sm text-slate-500 mt-1">Resolva solicitações dos restaurantes e mantenha o histórico por cliente.</p></div><button onClick={load} className="p-3 rounded-xl bg-white border border-slate-200"><RefreshCw className={loading ? 'animate-spin' : ''} size={18} /></button></div>
    <div className="grid lg:grid-cols-[360px_1fr] gap-5 min-h-[560px]">
      <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="p-4 border-b flex items-center justify-between"><span className="font-bold">Chamados ({tickets.length})</span><select value={status} onChange={e => setStatus(e.target.value)} className="text-xs border rounded-lg px-2 py-1"><option value="all">Todos</option>{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div><div className="divide-y max-h-[500px] overflow-y-auto">{tickets.map(t => <button key={t.id} onClick={() => select(t)} className={`w-full text-left p-4 hover:bg-slate-50 ${selected?.id === t.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}><div className="flex justify-between gap-2"><span className="font-bold text-sm truncate">{t.subject}</span><span className="text-[10px] uppercase font-bold text-orange-600">{t.priority}</span></div><p className="text-xs text-slate-500 mt-1">{t.establishment_name || 'Sem estabelecimento'}</p><p className="text-[11px] text-slate-400 mt-2">{statusLabels[t.status] || t.status} · {t.message_count} mensagens</p></button>)}{!tickets.length && <div className="p-8 text-center text-sm text-slate-400">Nenhum chamado nesta fila.</div>}</div></section>
      <section className="bg-white border border-slate-200 rounded-2xl flex flex-col">{selected ? <><div className="p-5 border-b"><div className="flex items-start justify-between gap-4"><div><h2 className="font-black text-lg">{selected.subject}</h2><p className="text-xs text-slate-500 mt-1">{selected.establishment_name} · {selected.requester_name} · {selected.requester_email}</p></div><select value={selected.status} onChange={async e => { await api.updateSupportTicket(selected.id, { status: e.target.value }); setSelected({ ...selected, status: e.target.value }); await load(); }} className="text-xs border rounded-lg px-2 py-2">{Object.entries(statusLabels).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div><p className="text-sm text-slate-700 mt-4 whitespace-pre-wrap">{selected.description}</p></div><div className="flex-1 p-5 space-y-3 overflow-y-auto">{messages.map(m => <div key={m.id} className={`p-3 rounded-xl max-w-[85%] ${m.user_role === 'superadmin' ? 'ml-auto bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}><p className="text-xs font-bold mb-1">{m.user_name} {m.internal ? '(interno)' : ''}</p><p className="text-sm whitespace-pre-wrap">{m.body}</p></div>)}</div><div className="p-4 border-t flex gap-2"><textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Escreva uma resposta..." className="flex-1 resize-none border rounded-xl p-3 text-sm" rows={2} /><button onClick={send} className="self-end bg-orange-500 text-white p-3 rounded-xl"><Send size={18} /></button></div></> : <div className="flex-1 flex items-center justify-center text-slate-400"><div className="text-center"><MessageSquare className="mx-auto mb-3" size={32} /><p>Selecione um chamado para atender.</p></div></div>}</section>
    </div>
  </div>;
}

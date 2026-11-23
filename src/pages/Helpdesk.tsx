import React, { useState, useEffect, useCallback } from 'react';
import { Headphones, Loader2, Send, Clock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_at?: string;
  updated_at?: string;
}

const STATUS_LABELS: Record<string, string> = { open: 'Aberto', in_progress: 'Em andamento', resolved: 'Resolvido', closed: 'Fechado' };
const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-blue-100 text-blue-700',
  resolved: 'bg-emerald-100 text-emerald-700',
  closed: 'bg-stone-200 text-stone-500',
};

export default function Helpdesk() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data || []).map((t: any) => ({
        id: t.id,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at
      })));
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleSubmit = async () => {
    if (!subject.trim() || !description.trim()) {
      setFeedback({ message: 'Preencha o assunto e a descrição do chamado.', type: 'error' });
      return;
    }
    setSending(true);
    try {
      const tenantId = await resolveTenantId();
      const { error } = await supabase
        .from('support_tickets')
        .insert({ tenant_id: tenantId, subject: subject.trim(), description: description.trim(), status: 'open', priority });
      if (error) throw error;
      setSubject('');
      setDescription('');
      setPriority('medium');
      setFeedback({ message: 'Chamado aberto! Nossa equipe vai responder em breve.', type: 'success' });
      await fetchTickets();
    } catch (err) {
      setFeedback({ message: 'Erro ao abrir o chamado. Tente novamente.', type: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {feedback.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
          <Headphones className="w-6 h-6 text-orange-500" />
          Central de Suporte
        </h1>
        <p className="text-stone-500 text-sm">Precisa de ajuda? Abra um chamado e nossa equipe vai te atender.</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <h2 className="font-bold text-stone-900 text-lg mb-4">Abrir novo chamado</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Assunto *</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: Não consigo gerar PIX na maquininha"
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Descrição *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o problema com o máximo de detalhes..."
              className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as any)} className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-900">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={sending}
              className="bg-stone-900 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 disabled:opacity-50"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Abrir chamado
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        <h2 className="font-bold text-stone-900 text-lg mb-4">Meus chamados</h2>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-stone-400">
            <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Você ainda não abriu nenhum chamado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(ticket => (
              <div key={ticket.id} className="border border-stone-100 rounded-2xl p-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-stone-900">{ticket.subject}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${ticket.priority === 'urgent' ? 'bg-red-100 text-red-700' : ticket.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-600'}`}>
                    {ticket.priority}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
                </div>
                <p className="text-sm text-stone-500 mt-1">{ticket.description}</p>
                <p className="text-xs text-stone-400 mt-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  {ticket.created_at ? new Date(ticket.created_at).toLocaleString('pt-BR') : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
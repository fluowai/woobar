import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Search, Loader2, ArrowRight, CheckCircle2, Clock, XCircle, Store } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Ticket {
  id: string;
  tenant_name?: string | null;
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
const PRIORITY_STYLES: Record<string, string> = {
  low: 'bg-stone-100 text-stone-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const NEXT_STATUS: Record<string, string> = { open: 'in_progress', in_progress: 'resolved', resolved: 'closed', closed: 'closed' };

export default function SupportAdmin() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*, tenants(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets((data || []).map((t: any) => ({
        id: t.id,
        tenant_name: t.tenants?.[0]?.name || t.tenants?.name || null,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        updated_at: t.updated_at
      })));
      setError(null);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Não foi possível carregar os chamados.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const advanceStatus = async (ticket: Ticket) => {
    const next = NEXT_STATUS[ticket.status];
    if (next === ticket.status) return;
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq('id', ticket.id);
      if (error) throw error;
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: next as any } : t));
      setFeedback({ message: `Chamado "${ticket.subject}": ${STATUS_LABELS[next]}.`, type: 'success' });
    } catch (err) {
      setFeedback({ message: 'Erro ao atualizar o chamado.', type: 'error' });
    }
  };

  const counts = tickets.reduce<Record<string, number>>((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  const filtered = tickets.filter(t => statusFilter === 'all' || t.status === statusFilter);

  return (
    <div className="space-y-6">
      {feedback && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {feedback.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold font-display text-stone-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-orange-500" />
          Chamados (Suporte)
        </h1>
        <p className="text-stone-500 text-sm">Central de atendimento da plataforma. Acompanhe e atualize chamados dos inquilinos.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === 'all' ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>
          Todos ({tickets.length})
        </button>
        {Object.keys(STATUS_LABELS).map(status => (
          <button key={status} onClick={() => setStatusFilter(status)} className={`px-4 py-2 rounded-full text-sm font-medium ${statusFilter === status ? 'bg-stone-900 text-white' : 'bg-white text-stone-600 border border-stone-200'}`}>
            {STATUS_LABELS[status]} ({counts[status] || 0})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-100">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-40 text-red-600 text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-stone-400">
            <CheckCircle2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhum chamado {statusFilter !== 'all' ? `com status "${STATUS_LABELS[statusFilter]}"` : ''} por aqui.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(ticket => (
              <div key={ticket.id} className="border border-stone-100 rounded-2xl p-4 hover:border-stone-200 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-stone-900">{ticket.subject}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${PRIORITY_STYLES[ticket.priority]}`}>{ticket.priority}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
                    </div>
                    <p className="text-sm text-stone-500 mt-1 line-clamp-2">{ticket.description}</p>
                    <p className="text-xs text-stone-400 mt-2 flex items-center gap-2">
                      <Store className="w-3 h-3" />{ticket.tenant_name || '—'}
                      <Clock className="w-3 h-3 ml-2" />{ticket.created_at ? new Date(ticket.created_at).toLocaleString('pt-BR') : ''}
                    </p>
                  </div>
                  {ticket.status !== 'closed' && (
                    <button
                      onClick={() => advanceStatus(ticket)}
                      className="shrink-0 bg-stone-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-stone-800"
                    >
                      {ticket.status === 'resolved' ? 'Fechar chamado' : 'Avançar status'}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                  {ticket.status === 'closed' && <XCircle className="w-5 h-5 text-stone-300 shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
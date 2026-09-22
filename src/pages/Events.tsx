import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, MapPin, Clock, Users, Ticket, Check, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';
import { SalesStore } from '../lib/store';
import { printReceipt } from '../lib/print';

interface EventTicket {
  id: string;
  name: string;
  price: number;
  available: number;
}

interface EventData {
  id: number;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  tickets: EventTicket[];
}

export default function Events() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [ticketSelection, setTicketSelection] = useState<{ [key: string]: number }>({});
  const [purchasing, setPurchasing] = useState(false);

  const fetchEvents = useCallback(async () => {
    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date');

      if (error) throw error;
      setEvents((data || []).map((e: any) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        time: e.time,
        location: e.location,
        image: e.image,
        tickets: Array.isArray(e.tickets) ? e.tickets : JSON.parse(e.tickets || '[]')
      })));
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleTicketChange = (ticketId: string, delta: number) => {
    setTicketSelection(prev => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + delta)
    }));
  };

  const total = selectedEvent ? selectedEvent.tickets.reduce((acc, ticket) => {
    return acc + (ticket.price * (ticketSelection[ticket.id] || 0));
  }, 0) : 0;

  const handlePurchase = async () => {
    if (!selectedEvent || total === 0) return;
    setPurchasing(true);

    try {
      const purchasedCodes: Array<{code: string; name: string; price: number}> = [];

      for (const ticket of selectedEvent.tickets) {
        const qty = ticketSelection[ticket.id] || 0;
        for (let i = 0; i < qty; i++) {
          const code = await SalesStore.generateCode();
          await SalesStore.addItem({
            code,
            itemName: `${selectedEvent.title} - ${ticket.name}`,
            itemId: selectedEvent.id,
            price: ticket.price,
            type: 'ticket'
          });
          purchasedCodes.push({ code, name: `${selectedEvent.title} - ${ticket.name}`, price: ticket.price });
        }
      }

      const updatedTickets = selectedEvent.tickets.map(t => ({
        ...t,
        available: t.available - (ticketSelection[t.id] || 0)
      }));

      const tenantId = await resolveTenantId();
      await supabase
        .from('events')
        .update({ tickets: updatedTickets })
        .eq('id', selectedEvent.id)
        .eq('tenant_id', tenantId);

      setTicketSelection({});
      setSelectedEvent(null);
      fetchEvents();

      if (purchasedCodes.length > 0) {
        printReceipt({
          title: selectedEvent.title,
          subtitle: 'Ingresso Eletrônico',
          items: purchasedCodes.map(c => ({ name: c.name, quantity: 1, price: c.price, total: c.price })),
          total: purchasedCodes.reduce((acc, c) => acc + c.price, 0),
          code: purchasedCodes.map(c => c.code).join(', '),
          codeLabel: 'CÓDIGO(S) DO INGRESSO',
          footer: 'Apresente este código na entrada do evento'
        });
      }
    } catch (err) {
      console.error('Error purchasing tickets:', err);
      alert('Erro ao processar compra. Tente novamente.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-2xl font-bold font-display text-stone-900 mb-6">Próximos Eventos</h2>
        {events.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum evento cadastrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {events.map((event) => (
              <motion.div
                key={event.id}
                layoutId={`event-${event.id}`}
                onClick={() => setSelectedEvent(event)}
                className={cn(
                  "group bg-white rounded-2xl border border-stone-100 overflow-hidden cursor-pointer transition-all hover:shadow-lg",
                  selectedEvent?.id === event.id ? "ring-2 ring-orange-500 border-transparent" : "hover:border-orange-200"
                )}
              >
                <div className="h-48 overflow-hidden relative">
                  <img 
                    src={event.image} 
                    alt={event.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-lg text-sm font-bold text-stone-900 shadow-sm">
                    {event.date}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-xl font-bold text-stone-900 mb-2">{event.title}</h3>
                  <div className="space-y-2 text-sm text-stone-500">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-orange-500" />
                      {event.time}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      {event.location}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full lg:w-96 bg-white rounded-2xl shadow-xl border border-stone-100 flex flex-col h-full z-10"
          >
            <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50/50 rounded-t-2xl">
              <h3 className="font-bold text-lg">Venda de Ingressos</h3>
              <button 
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 border-b border-stone-100">
              <h4 className="font-bold text-xl text-stone-900 mb-1">{selectedEvent.title}</h4>
              <p className="text-stone-500 text-sm">{selectedEvent.date} às {selectedEvent.time}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {selectedEvent.tickets.map((ticket) => (
                <div key={ticket.id} className="flex justify-between items-center p-4 bg-stone-50 rounded-xl border border-stone-100">
                  <div>
                    <p className="font-bold text-stone-900">{ticket.name}</p>
                    <p className="text-sm text-stone-500">R$ {Number(ticket.price).toFixed(2)}</p>
                    <p className="text-xs text-orange-600 mt-1">{ticket.available} disponíveis</p>
                  </div>
                  <div className="flex items-center gap-3 bg-white rounded-lg border border-stone-200 p-1">
                    <button 
                      onClick={() => handleTicketChange(ticket.id, -1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 rounded-md text-stone-500 transition-colors"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-medium">{ticketSelection[ticket.id] || 0}</span>
                    <button 
                      onClick={() => handleTicketChange(ticket.id, 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 rounded-md text-stone-900 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-stone-100 bg-stone-50 rounded-b-2xl">
              <div className="flex justify-between items-end mb-6">
                <span className="text-stone-500 font-medium">Total</span>
                <span className="text-3xl font-bold font-display text-stone-900">R$ {total.toFixed(2)}</span>
              </div>
              <button
                onClick={handlePurchase}
                disabled={total === 0 || purchasing}
                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold text-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
              >
                {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                {purchasing ? 'Processando...' : 'Confirmar Venda'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

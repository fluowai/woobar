import React, { useState } from 'react';
import { Calendar, MapPin, Clock, Users, Ticket, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

const EVENTS = [
  {
    id: 1,
    title: 'Samba de Domingo',
    date: '12 Nov 2023',
    time: '16:00',
    location: 'Palco Principal',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=800&q=80',
    tickets: [
      { id: 'gen', name: 'Pista', price: 30.00, available: 120 },
      { id: 'vip', name: 'Área VIP', price: 80.00, available: 45 },
    ]
  },
  {
    id: 2,
    title: 'Noite de Jazz',
    date: '15 Nov 2023',
    time: '20:00',
    location: 'Lounge Bar',
    image: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?auto=format&fit=crop&w=800&q=80',
    tickets: [
      { id: 'gen', name: 'Entrada', price: 50.00, available: 80 },
      { id: 'table', name: 'Mesa (4 lugares)', price: 250.00, available: 10 },
    ]
  },
  {
    id: 3,
    title: 'Rock Classics',
    date: '18 Nov 2023',
    time: '21:00',
    location: 'Palco Principal',
    image: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=800&q=80',
    tickets: [
      { id: 'gen', name: 'Pista', price: 40.00, available: 200 },
      { id: 'vip', name: 'Camarote', price: 100.00, available: 30 },
    ]
  }
];

export default function Events() {
  const [selectedEvent, setSelectedEvent] = useState<typeof EVENTS[0] | null>(null);
  const [ticketSelection, setTicketSelection] = useState<{ [key: string]: number }>({});

  const handleTicketChange = (ticketId: string, delta: number) => {
    setTicketSelection(prev => ({
      ...prev,
      [ticketId]: Math.max(0, (prev[ticketId] || 0) + delta)
    }));
  };

  const total = selectedEvent ? selectedEvent.tickets.reduce((acc, ticket) => {
    return acc + (ticket.price * (ticketSelection[ticket.id] || 0));
  }, 0) : 0;

  const handlePurchase = () => {
    alert(`Compra realizada com sucesso!\nTotal: R$ ${total.toFixed(2)}`);
    setTicketSelection({});
    setSelectedEvent(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      {/* Events List */}
      <div className="flex-1 overflow-y-auto pr-2">
        <h2 className="text-2xl font-bold font-display text-stone-900 mb-6">Próximos Eventos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {EVENTS.map((event) => (
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
      </div>

      {/* Ticket Sales Sidebar */}
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
                    <p className="text-sm text-stone-500">R$ {ticket.price.toFixed(2)}</p>
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
                disabled={total === 0}
                className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold text-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-200 flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                Confirmar Venda
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

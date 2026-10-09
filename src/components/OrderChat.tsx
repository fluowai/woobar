import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, User, Store, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface Message {
  id: string;
  sender: 'customer' | 'store';
  text: string;
  timestamp: Date;
}

interface OrderChatProps {
  orderId: string;
  customerName: string;
  onClose: () => void;
}

const mapMessages = (raw: any[]): Message[] =>
  (Array.isArray(raw) ? raw : []).map((m: any) => ({
    id: m.id || String(m.timestamp),
    sender: m.sender === 'customer' ? 'customer' : 'store',
    text: String(m.text || ''),
    timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
  }));

export default function OrderChat({ orderId, customerName, onClose }: OrderChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const order = await api.getOrder(orderId);
      setMessages(mapMessages(order?.messages));
      setError('');
    } catch (e: any) {
      setError(e.message || 'Falha ao carregar conversa');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    setLoading(true);
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = newMessage.trim();
    if (!text || sending) return;

    setSending(true);
    try {
      const res = await api.sendMessage(orderId, text, 'store');
      setMessages(prev => [...prev, {
        id: res?.id || String(Date.now()),
        sender: 'store',
        text,
        timestamp: new Date(),
      }]);
      setNewMessage('');
    } catch (err: any) {
      setError(err.message || 'Falha ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      className="fixed bottom-4 right-4 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden z-50 flex flex-col h-[500px]"
    >
      {/* Header */}
      <div className="bg-stone-900 text-white p-4 flex justify-between items-center shadow-md">
        <div>
          <h3 className="font-bold text-sm">{customerName}</h3>
          <p className="text-xs text-stone-400">Pedido {orderId.slice(0, 6).toUpperCase()}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-stone-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 text-sm gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            <p>Carregando conversa...</p>
          </div>
        ) : error && messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-3">
            <p className="text-sm text-red-600">{error}</p>
            <button onClick={load} className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium">
              Tentar novamente
            </button>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-stone-400 text-sm">
            <p>Nenhuma mensagem ainda.</p>
            <p>Inicie a conversa com o cliente.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 max-w-[85%]",
                msg.sender === 'store' ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                msg.sender === 'store' ? "bg-stone-900 text-white" : "bg-stone-200 text-stone-600"
              )}>
                {msg.sender === 'store' ? <Store className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>
              <div className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                msg.sender === 'store'
                  ? "bg-stone-900 text-white rounded-tr-none"
                  : "bg-white text-stone-800 rounded-tl-none border border-stone-100"
              )}>
                <p>{msg.text}</p>
                <span className={cn(
                  "text-[10px] block mt-1 opacity-70",
                  msg.sender === 'store' ? "text-stone-300" : "text-stone-400"
                )}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {error && messages.length > 0 && (
        <p className="px-3 py-1 text-[11px] text-red-600 bg-red-50 border-t border-red-100">{error}</p>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Digite uma mensagem..."
          className="flex-1 bg-stone-100 border-none rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-stone-900 outline-none"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="bg-stone-900 text-white p-2 rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </motion.div>
  );
}

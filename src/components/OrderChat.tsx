import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';

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

export default function OrderChat({ orderId, customerName, onClose }: OrderChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        const tenantId = await resolveTenantId();
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('order_id', orderId)
          .order('timestamp', { ascending: true });

        if (error || !data) {
          setMessages([]);
          return;
        }

        if (!cancelled) {
          setMessages(data.map((m: any) => ({
            id: String(m.id),
            sender: m.sender as 'customer' | 'store',
            text: m.message,
            timestamp: new Date(m.timestamp)
          })));
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
    }

    loadMessages();

    const channel = supabase
      .channel(`chat-${orderId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `order_id=eq.${orderId}`
      }, (payload) => {
        const m = payload.new as any;
        setMessages(prev => [...prev, {
          id: String(m.id),
          sender: m.sender as 'customer' | 'store',
          text: m.message,
          timestamp: new Date(m.timestamp)
        }]);
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    const tempId = `temp-${Date.now()}`;
    const msg: Message = {
      id: tempId,
      sender: 'store',
      text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, msg]);

    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          tenant_id: tenantId,
          order_id: orderId,
          sender: 'store',
          message: text,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (!error && data) {
        setMessages(prev => prev.map(m => m.id === tempId ? {
          id: String(data.id),
          sender: 'store',
          text,
          timestamp: new Date(data.timestamp)
        } : m));
      }
    } catch (err) {
      console.error('Error sending message:', err);
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
          <p className="text-xs text-stone-400">Pedido {orderId}</p>
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
        {messages.length === 0 ? (
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
          disabled={!newMessage.trim()}
          className="bg-stone-900 text-white p-2 rounded-xl hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </motion.div>
  );
}

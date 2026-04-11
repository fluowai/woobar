import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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

const MOCK_MESSAGES: Record<string, Message[]> = {
  '#2021': [
    { id: '1', sender: 'customer', text: 'Olá, gostaria de saber se posso trocar o refrigerante?', timestamp: new Date(Date.now() - 1000 * 60 * 15) },
    { id: '2', sender: 'store', text: 'Olá Ana! Claro, qual você prefere?', timestamp: new Date(Date.now() - 1000 * 60 * 14) },
    { id: '3', sender: 'customer', text: 'Guaraná, por favor.', timestamp: new Date(Date.now() - 1000 * 60 * 12) },
  ],
  '#2018': [
    { id: '1', sender: 'store', text: 'Seu pedido saiu para entrega!', timestamp: new Date(Date.now() - 1000 * 60 * 5) },
    { id: '2', sender: 'customer', text: 'Ótimo, estou aguardando na portaria.', timestamp: new Date(Date.now() - 1000 * 60 * 2) },
  ]
};

export default function OrderChat({ orderId, customerName, onClose }: OrderChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load mock messages or empty array
    setMessages(MOCK_MESSAGES[orderId] || []);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now().toString(),
      sender: 'store',
      text: newMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, msg]);
    setNewMessage('');
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

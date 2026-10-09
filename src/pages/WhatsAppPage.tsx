import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Phone, Search, MoreVertical, Send, QrCode,
  Check, CheckCheck, Wifi, WifiOff, RefreshCw, LogOut,
  ArrowLeft, Loader2, Smartphone, Clock, Trash2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { API_BASE, getWsUrl } from '../lib/api';

const API_URL = API_BASE;
const WS_URL = getWsUrl();

interface WAChat {
  jid: string;
  name: string;
  lastMessage: string;
  lastTime: number;
  unread: number;
  isGroup: boolean;
}

interface WAMessage {
  id: string;
  remoteJid: string;
  fromMe: boolean;
  participant: string;
  pushName: string;
  text: string;
  type: string;
  mediaUrl: string | null;
  timestamp: number;
}

type ViewState = 'qr' | 'connected' | 'connecting' | 'disconnected' | 'error';

export default function WhatsAppPage() {
  const [view, setView] = useState<ViewState>('disconnected');
  const [qrData, setQrData] = useState<string | null>(null);
  const [chats, setChats] = useState<WAChat[]>([]);
  const [messages, setMessages] = useState<WAMessage[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [wsUser, setWsUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [actionError, setActionError] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    fetchStatus();
    connectWS();
    return () => { wsRef.current?.close(); };
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  function getToken() {
    return localStorage.getItem('woobar_token');
  }

  async function waFetch(path: string, options: RequestInit = {}): Promise<any> {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
        Authorization: `Bearer ${getToken()}`,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      throw new Error(err.error || `Erro ${res.status}`);
    }
    return res.json();
  }

  async function fetchStatus() {
    try {
      const data = await waFetch('/whatsapp/status');
      setView(data.status as ViewState);
      if (data.user) setWsUser(data.user);

      if (data.status === 'qr') {
        const qr = await waFetch('/whatsapp/qr');
        if (qr.qr) setQrData(qr.qr);
      }
      if (data.status === 'connected') {
        fetchChats();
      }
      setActionError('');
    } catch (e: any) {
      setActionError(e.message || 'Falha ao consultar status');
    }
  }

  function connectWS() {
    try {
      const token = getToken();
      if (!token) return;
      const ws = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);
      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token }));
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'wa_update') {
            handleWAUpdate(data);
          }
        } catch {}
      };
      ws.onclose = () => {
        setTimeout(connectWS, 3000);
      };
      wsRef.current = ws;
    } catch {}
  }

  function handleWAUpdate(data: any) {
    if (data.type === 'qr' && data.qr) {
      setView('qr');
      setQrData(data.qr);
    }
    if (data.type === 'connected') {
      setView('connected');
      setWsUser(data.user);
      fetchChats();
    }
    if (data.type === 'disconnected') {
      setView('disconnected');
      setQrData(null);
    }
    if (data.type === 'logged_out') {
      setView('disconnected');
      setQrData(null);
      setWsUser(null);
    }
    if (data.type === 'error') {
      setView('error');
    }
    if (data.type === 'chats' && data.chats) {
      setChats(data.chats);
    }
    if (data.type === 'new_message') {
      if (data.jid === selectedChat) {
        setMessages(prev => {
          if (prev.find(m => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
      fetchChats();
    }
  }

  async function connectWA() {
    setView('connecting');
    setActionError('');
    try {
      await waFetch('/whatsapp/connect', { method: 'POST' });
      setTimeout(fetchStatus, 2000);
    } catch (e: any) {
      setActionError(e.message || 'Falha ao conectar');
      setView('error');
    }
  }

  async function disconnectWA() {
    try {
      await waFetch('/whatsapp/disconnect', { method: 'POST' });
      setView('disconnected');
      setQrData(null);
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      setActionError('');
    } catch (e: any) {
      setActionError(e.message || 'Falha ao desconectar');
    }
  }

  async function resetSession() {
    try {
      await waFetch('/whatsapp/reset', { method: 'POST' });
      setView('disconnected');
      setQrData(null);
      setChats([]);
      setMessages([]);
      setSelectedChat(null);
      setActionError('');
    } catch (e: any) {
      setActionError(e.message || 'Falha ao resetar sessão');
    }
  }

  async function fetchChats() {
    try {
      const data = await waFetch('/whatsapp/chats');
      setChats(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setActionError(e.message || 'Falha ao carregar conversas');
    }
  }

  async function selectChat(jid: string) {
    setSelectedChat(jid);
    setActionError('');
    try {
      const data = await waFetch(`/whatsapp/chats/${encodeURIComponent(jid)}/messages?limit=100`);
      setMessages(Array.isArray(data) ? data : []);
      scrollToBottom();
    } catch (e: any) {
      setActionError(e.message || 'Falha ao carregar mensagens');
    }
  }

  async function sendMessage() {
    if (!inputText.trim() || !selectedChat || sending) return;
    setSending(true);
    const text = inputText;
    setInputText('');
    try {
      await waFetch('/whatsapp/send', {
        method: 'POST',
        body: JSON.stringify({ jid: selectedChat, text }),
      });
      setActionError('');
    } catch (e: any) {
      setActionError(e.message || 'Falha ao enviar mensagem');
      setInputText(text);
    }
    setSending(false);
    inputRef.current?.focus();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedChatData = chats.find(c => c.jid === selectedChat);
  const isMobileView = typeof window !== 'undefined' && window.innerWidth < 768;
  const showChatList = !selectedChat || !isMobileView;
  const showChatPanel = !!selectedChat || !isMobileView;

  function formatTime(ts: number) {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function formatDateHeader(ts: number) {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (isToday) return 'Hoje';
    if (d.toDateString() === yesterday.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  }

  function groupMessagesByDate(msgs: WAMessage[]): { date: string; messages: WAMessage[] }[] {
    const groups: { date: string; messages: WAMessage[] }[] = [];
    let currentDate = '';
    for (const msg of msgs) {
      const dateLabel = formatDateHeader(msg.timestamp);
      if (dateLabel !== currentDate) {
        currentDate = dateLabel;
        groups.push({ date: dateLabel, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    }
    return groups;
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* QR / Connect View */}
      {(view === 'disconnected' || view === 'qr' || view === 'connecting' || view === 'error') && (
        <div className="flex-1 flex items-center justify-center bg-stone-50/50">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-3xl shadow-xl border border-stone-100 p-8 max-w-md w-full mx-4">
            {view === 'disconnected' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <MessageCircle className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold font-display text-stone-900 mb-2">WhatsApp Business</h2>
                <p className="text-stone-500 mb-8">Conecte-se ao WhatsApp para gerenciar conversas com seus clientes diretamente do Woobar.</p>
                <button onClick={connectWA} className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl font-medium hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 text-lg">
                  <MessageCircle className="w-5 h-5" />
                  Conectar WhatsApp
                </button>
                <p className="text-xs text-stone-400 mt-4">Escaneie o QR code com seu WhatsApp para iniciar a sessão.</p>
                {actionError && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{actionError}</p>}
              </div>
            )}

            {view === 'connecting' && (
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-stone-900 mb-2">Conectando...</h2>
                <p className="text-stone-500">Preparando conexão com WhatsApp</p>
              </div>
            )}

            {view === 'qr' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Smartphone className="w-10 h-10 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold font-display text-stone-900 mb-2">Escaneie o QR Code</h2>
                <p className="text-stone-500 mb-6">Abra o WhatsApp no seu celular e escaneie o código abaixo</p>
                {qrData && (
                  <div className="bg-white p-4 rounded-2xl border-2 border-stone-200 inline-block mx-auto mb-6 shadow-sm">
                    <img src={qrData} alt="QR Code" className="w-64 h-64" />
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={connectWA} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Atualizar QR
                  </button>
                  <button onClick={resetSession} className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {view === 'error' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <WifiOff className="w-10 h-10 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-stone-900 mb-2">Erro de Conexão</h2>
                <p className="text-stone-500 mb-6">Não foi possível conectar ao WhatsApp</p>
                {actionError && <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{actionError}</p>}
                <button onClick={connectWA} className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 transition-colors">
                  Tentar Novamente
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Chat Interface */}
      {view === 'connected' && (
        <div className="flex-1 flex bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
          {/* Chat List Sidebar */}
          <AnimatePresence>
            {showChatList && (
              <motion.div initial={false} animate={{ width: isMobileView && selectedChat ? 0 : 320 }} className={cn("flex-shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-hidden", isMobileView && selectedChat ? "hidden" : "w-80")}>
                {/* Header */}
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <MessageCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-stone-900 text-sm">WhatsApp</h2>
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                        Conectado
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={disconnectWA} className="p-2 text-stone-400 hover:text-red-500 rounded-lg hover:bg-stone-100" title="Desconectar">
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Pesquisar conversa..."
                      className="w-full pl-10 pr-4 py-2.5 bg-stone-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                  </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto">
                  {actionError && (
                    <p className="m-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2">{actionError}</p>
                  )}
                  {filteredChats.length === 0 ? (
                    <div className="text-center py-12 text-stone-400">
                      <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma conversa encontrada</p>
                    </div>
                  ) : (
                    filteredChats.map(chat => (
                      <button key={chat.jid} onClick={() => selectChat(chat.jid)}
                        className={cn("w-full px-4 py-3.5 flex items-start gap-3 hover:bg-stone-50 transition-colors text-left border-b border-stone-50",
                          selectedChat === chat.jid && "bg-emerald-50 hover:bg-emerald-50")}>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold flex-shrink-0 shadow-sm">
                          {chat.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-stone-900 text-sm truncate">{chat.name}</span>
                            <span className="text-xs text-stone-400 flex-shrink-0">{formatTime(chat.lastTime)}</span>
                          </div>
                          <p className="text-xs text-stone-500 truncate">{chat.lastMessage}</p>
                        </div>
                        {chat.unread > 0 && (
                          <span className="flex-shrink-0 bg-emerald-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {chat.unread > 99 ? '99+' : chat.unread}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat Panel */}
          <AnimatePresence>
            {showChatPanel && selectedChat ? (
              <motion.div initial={false} className="flex-1 flex flex-col bg-stone-50 min-w-0">
                {/* Chat Header */}
                <div className="px-6 py-3.5 border-b border-stone-200 bg-white flex items-center justify-between flex-shrink-0 shadow-sm">
                  <div className="flex items-center gap-3">
                    {isMobileView && (
                      <button onClick={() => setSelectedChat(null)} className="p-1 text-stone-500 hover:text-stone-900">
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold shadow-sm">
                      {selectedChatData?.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{selectedChatData?.name || 'Desconhecido'}</h3>
                      <p className="text-xs text-emerald-600 font-medium">Online</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-stone-400 hover:text-stone-600 rounded-lg hover:bg-stone-100">
                      <Phone className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 py-4 space-y-1 bg-stone-50">
                  {groupMessagesByDate(messages).map((group, gi) => (
                    <div key={gi}>
                      <div className="flex justify-center my-4">
                        <span className="text-xs text-stone-400 bg-white px-3 py-1 rounded-full shadow-sm border border-stone-100">{group.date}</span>
                      </div>
                      {group.messages.map((msg) => (
                        <div key={msg.id} className={cn("flex mb-1", msg.fromMe ? "justify-end" : "justify-start")}>
                          <div className={cn("max-w-[75%] md:max-w-[60%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                            msg.fromMe
                              ? "bg-emerald-500 text-white rounded-br-md"
                              : "bg-white text-stone-900 border border-stone-100 rounded-bl-md"
                          )}>
                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            <div className={cn("flex items-center justify-end gap-1 mt-1", msg.fromMe ? "text-emerald-200" : "text-stone-400")}>
                              <span className="text-[10px] leading-none">{formatTime(msg.timestamp)}</span>
                              {msg.fromMe && <CheckCheck className="w-3 h-3" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="px-4 py-3 bg-white border-t border-stone-200 flex-shrink-0">
                  {actionError && (
                    <p className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg p-2 flex justify-between items-center">
                      <span>{actionError}</span>
                      <button onClick={() => setActionError('')} className="ml-2 font-bold">✕</button>
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <input ref={inputRef} type="text" value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={handleKeyDown}
                      placeholder="Digite uma mensagem..."
                      className="flex-1 px-5 py-3 bg-stone-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 border border-stone-200" />
                    <button onClick={sendMessage} disabled={!inputText.trim() || sending}
                      className={cn("w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-sm",
                        inputText.trim()
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-200"
                          : "bg-stone-100 text-stone-400"
                      )}>
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : showChatPanel && (
              <div className="flex-1 flex items-center justify-center bg-stone-50">
                <div className="text-center">
                  <div className="w-24 h-24 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageCircle className="w-12 h-12 text-stone-300" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-stone-900 mb-2">Woobar WhatsApp</h3>
                  <p className="text-stone-500 max-w-sm">Selecione uma conversa para começar a atender seus clientes</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

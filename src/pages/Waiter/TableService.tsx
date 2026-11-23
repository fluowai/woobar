import React from 'react';
import { useMenu } from '../../hooks/useMenu';
import { useOrders } from '../../hooks/useOrders';
import { Armchair, Coffee, Search, Plus, Minus, Send, Loader2, CheckCircle2, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { MenuItem } from '../../lib/database.types';
import { printReceipt } from '../../lib/print';

export default function TableService() {
  const { items: menuItems, loading } = useMenu();
  const { createOrder } = useOrders();
  const [selectedTable, setSelectedTable] = React.useState<number | null>(null);
  const [cart, setCart] = React.useState<{item: MenuItem, quantity: number}[]>([]);
  const [search, setSearch] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState<{ table: number; total: number } | null>(null);

  const tables = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const filteredItems = menuItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(p => {
      if (p.item.id === id) {
        return { ...p, quantity: Math.max(0, p.quantity + delta) };
      }
      return p;
    }).filter(p => p.quantity > 0));
  };

  const total = cart.reduce((acc, curr) => acc + (curr.item.price * curr.quantity), 0);

  const handleSendToKitchen = async () => {
    if (!selectedTable || cart.length === 0) return;
    setSending(true);
    try {
      const order = await createOrder({
        customer: `Mesa ${selectedTable}`,
        items: cart.map(c => ({ id: c.item.id, name: c.item.name, price: c.item.price, quantity: c.quantity })),
        total,
        address: `Mesa ${selectedTable}`,
        notes: 'Pedido via atendimento de mesa'
      });
      setSent({ table: selectedTable, total });
      setCart([]);
      setSelectedTable(null);

      printReceipt({
        title: 'Cozinha - Pedido',
        subtitle: `Mesa ${selectedTable}`,
        items: cart.map(c => ({ name: c.item.name, quantity: c.quantity, price: c.item.price, total: c.item.price * c.quantity })),
        total,
        footer: `Mesa ${selectedTable}`
      });

      setTimeout(() => setSent(null), 4000);
    } catch (err) {
      console.error('Erro ao enviar pedido:', err);
      alert('Erro ao enviar o pedido. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="p-4">Carregando cardápio...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] max-w-lg mx-auto bg-white rounded-3xl shadow-sm border border-stone-200 overflow-hidden relative">
      {/* Header */}
      <div className="bg-stone-900 text-white p-6">
        <h2 className="text-xl font-bold font-display flex items-center gap-2">
          <Coffee className="w-5 h-5 text-orange-400" />
          Atendimento
        </h2>
        <p className="text-stone-400 text-sm mt-1">Selecione a mesa e anote o pedido.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
        
        {/* Table Selection */}
        <div>
          <h3 className="text-sm font-bold text-stone-500 mb-3 uppercase tracking-wider">Selecione a Mesa</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {tables.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTable(t)}
                className={`flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center border-2 transition-all ${
                  selectedTable === t 
                    ? 'border-orange-500 bg-orange-50 text-orange-600' 
                    : 'border-stone-100 bg-white text-stone-600 hover:border-stone-300'
                }`}
              >
                <Armchair className="w-4 h-4 mb-1" />
                <span className="text-xs font-bold font-mono">{t}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items */}
        {selectedTable && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-2">
              {filteredItems.map(item => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="flex-1">
                    <h4 className="font-bold text-stone-800 text-sm">{item.name}</h4>
                    <span className="font-mono text-orange-600 text-xs font-bold">R$ {item.price.toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Cart Summary */}
      <AnimatePresence>
        {cart.length > 0 && selectedTable && (
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-10"
          >
            <div className="p-4 max-h-48 overflow-y-auto space-y-2 bg-stone-50/50">
              {cart.map(c => (
                <div key={c.item.id} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700 truncate flex-1">{c.item.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(c.item.id, -1)} className="p-1 rounded bg-stone-200"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                    <button onClick={() => updateQty(c.item.id, 1)} className="p-1 rounded bg-stone-200"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-white flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-stone-500 uppercase font-bold">Total Mesa {selectedTable}</p>
                <p className="text-xl font-bold font-mono text-stone-900">R$ {total.toFixed(2)}</p>
              </div>
              <button 
                onClick={handleSendToKitchen}
                disabled={sending}
                className="flex-1 bg-stone-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-stone-800 disabled:opacity-50"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Enviar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold shadow-xl"
          >
            <CheckCircle2 className="w-4 h-4" />
            Pedido da Mesa {sent.table} enviado! R$ {sent.total.toFixed(2)}
            <button onClick={() => printReceipt({ title: 'Cozinha - Pedido', subtitle: `Mesa ${sent.table}`, items: cart.map(c => ({ name: c.item.name, quantity: c.quantity, price: c.item.price, total: c.item.price * c.quantity })), total: sent.total, footer: `Mesa ${sent.table}` })} className="ml-2 p-1 bg-white/20 rounded hover:bg-white/40">
              <Printer className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

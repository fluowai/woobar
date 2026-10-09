import React, { useState, useEffect } from 'react';
import { Beer, Wine, GlassWater, Coffee, Trash2, Printer, CreditCard, Banknote, QrCode, Loader2, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

type QuickItem = { id: string; name: string; price: number; icon: any; color: string };

const iconFor = (category: string, name: string) => {
  const c = `${category} ${name}`.toLowerCase();
  if (/cerveja|beer/.test(c)) return Beer;
  if (/vinho|wine|whisky|vodka|gin|destilado|dose/.test(c)) return Wine;
  if (/água|agua|water/.test(c)) return GlassWater;
  if (/café|cafe|refrigerante|energét|energet/.test(c)) return Coffee;
  return ShoppingBag;
};

const COLORS = [
  'bg-amber-100 text-amber-700 border-amber-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-red-100 text-red-700 border-red-200',
  'bg-stone-100 text-stone-700 border-stone-200',
  'bg-emerald-100 text-emerald-700 border-emerald-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-purple-100 text-purple-700 border-purple-200',
];

export default function BarTokens() {
  const [cart, setCart] = useState<{id: string, name: string, price: number, quantity: number}[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'pix'>('credit');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [items, setItems] = useState<QuickItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getProducts();
      setItems((Array.isArray(data) ? data : []).map((p: any, i: number) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        icon: iconFor(p.category_name || '', p.name),
        color: COLORS[i % COLORS.length],
      })));
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addToCart = (item: QuickItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handlePrint = async () => {
    if (cart.length === 0) return;
    setBusy(true); setMessage('');
    try {
      const result = await api.sellTokens({ items: cart.map(item => ({ product_id: item.id, name: item.name, price: item.price, quantity: item.quantity, type: 'token' })), payment_method: paymentMethod });
      setMessage(`${result.codes.length} ficha(s) gerada(s) e enviada(s) para impressão.`);
      setCart([]);
    } catch (e: any) { setMessage(e.message || 'Falha ao gerar fichas.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-4"><div className="flex flex-col lg:flex-row min-h-[calc(100vh-10rem)] gap-6">
      {/* Quick Selection Grid */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-stone-100 p-6 overflow-y-auto">
        <h2 className="text-2xl font-bold font-display text-stone-900 mb-6">Venda Rápida</h2>
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-stone-400 py-16">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Carregando produtos...</span>
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-red-600">{loadError}</p>
            <button onClick={load} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">Nenhum produto cadastrado no cardápio</p>
        ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(item)}
              className={cn(
                "flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all h-40 gap-3",
                item.color,
                "hover:brightness-95"
              )}
            >
              <item.icon className="w-8 h-8" />
              <div className="text-center">
                <span className="block font-bold text-lg">{item.name}</span>
                <span className="block text-sm opacity-80 font-mono">R$ {item.price.toFixed(2)}</span>
              </div>
            </motion.button>
          ))}
        </div>
        )}
      </div>

      {/* Transaction Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Printer className="w-5 h-5 text-stone-500" />
            Cupom Atual
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50">
                <p>Nenhum item selecionado</p>
              </div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100"
                >
                  <div>
                    <p className="font-medium text-stone-900">{item.quantity}x {item.name}</p>
                    <p className="text-sm text-stone-500">R$ {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.id)}
                    className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-stone-100 space-y-4 bg-stone-50">
          <div>
            <p className="text-sm text-stone-500 mb-2 font-medium">Forma de Pagamento</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { id: 'credit', icon: CreditCard, label: 'Crédito' },
                { id: 'debit', icon: CreditCard, label: 'Débito' },
                { id: 'cash', icon: Banknote, label: 'Dinheiro' },
                { id: 'pix', icon: QrCode, label: 'Pix' },
              ].map((method) => (
                <button
                  key={method.id}
                  onClick={() => setPaymentMethod(method.id as any)}
                  className={cn(
                    "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs font-medium gap-1",
                    paymentMethod === method.id
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                  )}
                >
                  <method.icon className="w-4 h-4" />
                  {method.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-between items-end pt-2 border-t border-stone-200">
            <span className="text-stone-500 font-medium">Total a Pagar</span>
            <span className="text-3xl font-bold font-display text-stone-900">R$ {total.toFixed(2)}</span>
          </div>

          {message && <p className="text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded-xl p-3">{message}</p>}
          <button
            onClick={handlePrint}
            disabled={cart.length === 0 || busy}
            className="w-full py-4 bg-orange-500 text-white rounded-xl font-bold text-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-200 active:scale-95"
          >
            {busy ? 'Gerando e enviando...' : 'Gerar e Imprimir Fichas'}
          </button>
        </div>
      </div>
    </div></div>
  );
}

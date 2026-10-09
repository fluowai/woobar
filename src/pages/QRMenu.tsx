import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, ShoppingBag, Store, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { publicApi } from '../lib/api';

type MenuItem = { id: string; name: string; description: string; price: number; image: string | null; category: string | null };

export default function QRMenu() {
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState('Todos');
  const [cart, setCart] = useState<{ id: string; qty: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [storeName, setStoreName] = useState('Woobar');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentOrder, setSentOrder] = useState<{ id: string; total: number } | null>(null);
  const [sendError, setSendError] = useState('');

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await publicApi.getKioskCatalog();
      setItems(Array.isArray(data?.products) ? data.products : []);
      if (data?.establishment?.name) setStoreName(data.establishment.name);
    } catch (e: any) {
      setLoadError(e.message || 'Não foi possível carregar o cardápio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category || 'Outros')))];
  const filtered = items.filter(i => {
    const m = cat === 'Todos' || (i.category || 'Outros') === cat;
    const s = i.name.toLowerCase().includes(search.toLowerCase());
    return m && s;
  });

  const add = (id: string) => setCart(prev => { const e = prev.find(i => i.id === id); return e ? prev.map(i => i.id === id ? { ...i, qty: i.qty + 1 } : i) : [...prev, { id, qty: 1 }]; });
  const update = (id: string, d: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + d } : i).filter(i => i.qty > 0));
  const total = cart.reduce((s, c) => { const i = items.find(p => p.id === c.id); return s + (i ? i.price * c.qty : 0); }, 0);

  const submit = async () => {
    if (!cart.length || sending) return;
    setSending(true);
    setSendError('');
    try {
      const res = await publicApi.createKioskOrder({
        items: cart.map(c => ({ product_id: c.id, quantity: c.qty })),
        payment_method: 'counter',
        customer_name: 'Cliente Cardápio',
      });
      setSentOrder({ id: res?.order_number || res?.id || '', total: Number(res?.total) || total });
      setCart([]);
      setShowCart(false);
    } catch (e: any) {
      setSendError(e.message || 'Falha ao enviar pedido');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="bg-orange-500 text-white p-6 pt-12">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold font-display">{storeName}</h1>
            <p className="text-orange-100 text-sm">Faça seu pedido direto da mesa</p>
          </div>
          <Store className="w-8 h-8 opacity-80" />
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar no cardápio..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-orange-600/30 text-white placeholder-orange-200 border border-orange-400/30 focus:ring-2 focus:ring-white/30 outline-none" />
        </div>
      </div>

      {sentOrder && (
        <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 p-4 flex items-center justify-center gap-2 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          Pedido {sentOrder.id} enviado! Total R$ {sentOrder.total.toFixed(2)} — aguarde a confirmação.
          <button onClick={() => setSentOrder(null)} className="ml-2 underline">fechar</button>
        </div>
      )}

      <div className="sticky top-0 bg-white border-b border-stone-100 p-3 flex gap-2 overflow-x-auto z-10 shadow-sm">
        {categories.map(c => (
          <button key={c} onClick={() => setCat(c)} className={cn("px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors", cat === c ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600")}>
            {c}
          </button>
        ))}
      </div>

      <div className="p-4 pb-32 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-stone-400 py-16">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Carregando cardápio...</span>
          </div>
        ) : loadError ? (
          <div className="text-center py-16">
            <p className="text-sm text-red-600 mb-4">{loadError}</p>
            <button onClick={load} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-16">Nenhum item encontrado</p>
        ) : filtered.map(item => (
          <motion.div key={item.id} layout className="bg-white rounded-2xl border border-stone-100 overflow-hidden flex shadow-sm">
            {item.image
              ? <img src={item.image} alt={item.name} className="w-28 h-28 object-cover" referrerPolicy="no-referrer" />
              : <div className="w-28 h-28 bg-orange-50 text-orange-300 flex items-center justify-center"><Store className="w-8 h-8" /></div>}
            <div className="flex-1 p-4 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-stone-900">{item.name}</h3>
                <p className="text-xs text-stone-500 line-clamp-2">{item.description}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-orange-600 text-lg font-mono">R$ {Number(item.price).toFixed(2)}</span>
                <button onClick={() => add(item.id)} className="w-9 h-9 bg-stone-900 text-white rounded-xl flex items-center justify-center hover:bg-stone-800 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-4 shadow-2xl">
          <button onClick={() => setShowCart(!showCart)} className="w-full py-3 bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg">
            <ShoppingBag className="w-5 h-5" />
            Ver Pedido ({cart.length} itens) — R$ {total.toFixed(2)}
          </button>

          <AnimatePresence>
            {showCart && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
                  {cart.map(ci => {
                    const item = items.find(i => i.id === ci.id);
                    if (!item) return null;
                    return (
                      <div key={ci.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl">
                        <div>
                          <p className="font-medium text-stone-900 text-sm">{item.name}</p>
                          <p className="text-xs text-stone-500">R$ {Number(item.price).toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => update(ci.id, -1)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                          <span className="font-medium text-sm w-4 text-center">{ci.qty}</span>
                          <button onClick={() => update(ci.id, 1)} className="w-7 h-7 rounded-full bg-white border border-stone-200 flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {sendError && <p className="text-sm text-red-600 mt-3">{sendError}</p>}
                <button onClick={submit} disabled={sending}
                  className="w-full mt-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                  {sending ? 'Enviando...' : 'Enviar Pedido'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

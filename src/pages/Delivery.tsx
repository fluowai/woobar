import React, { useEffect, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, Loader2, CheckCircle } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type MenuItem = { id: string; name: string; description: string | null; price: number; image: string | null; category_name: string | null };

export default function Delivery() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{ id: string; quantity: number }[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [checkout, setCheckout] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: '', customer_phone: '', customer_address: '', payment_method: 'pix' });
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getProducts();
      setItems(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = ['Todos', ...Array.from(new Set(items.map(i => i.category_name || 'Outros')))];
  const filteredItems = items.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || (item.category_name || 'Outros') === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (id: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(item => item.id !== id));

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev
      .map(item => item.id === id ? { ...item, quantity: item.quantity + delta } : item)
      .filter(item => item.quantity > 0));
  };

  const cartTotal = cart.reduce((total, cartItem) => {
    const item = items.find(i => i.id === cartItem.id);
    return total + (item ? item.price * cartItem.quantity : 0);
  }, 0);

  const placeOrder = async () => {
    if (!form.customer_name.trim()) { toast.error('Informe o nome do cliente'); return; }
    if (!cart.length) return;
    setPlacing(true);
    try {
      const res = await api.createOrder({
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: form.customer_address.trim(),
        items: cart.map(c => ({ product_id: c.id, quantity: c.quantity })),
        payment_method: form.payment_method,
        channel: 'website',
      });
      setPlaced(res?.id?.slice(0, 6).toUpperCase() || '');
      setCart([]);
      setCheckout(false);
      setForm({ customer_name: '', customer_phone: '', customer_address: '', payment_method: 'pix' });
      toast.success('Pedido criado!');
    } catch (e) {
      toast.error(e);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      {/* Menu Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-2xl font-bold font-display text-stone-900">Cardápio</h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar item..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                  selectedCategory === cat
                    ? "bg-stone-900 text-white"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Carregando cardápio...</span>
            </div>
          ) : loadError ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <p className="text-sm text-red-600 mb-4">{loadError}</p>
              <button onClick={load} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full flex items-center justify-center text-stone-400 text-sm">Nenhum item encontrado</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredItems.map(item => (
                <motion.div
                  key={item.id}
                  layoutId={`product-${item.id}`}
                  className="group bg-white rounded-xl border border-stone-100 hover:border-orange-200 hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-orange-50 flex items-center justify-center text-orange-300">
                        <ShoppingBag className="w-10 h-10" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <button
                        onClick={() => addToCart(item.id)}
                        className="w-full bg-white text-stone-900 py-2 rounded-lg font-medium hover:bg-orange-500 hover:text-white transition-colors"
                      >
                        Adicionar ao Pedido
                      </button>
                    </div>
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-stone-900">{item.name}</h3>
                      <span className="font-mono font-medium text-orange-600">R$ {Number(item.price).toFixed(2)}</span>
                    </div>
                    <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
            Seu Pedido
          </h3>
        </div>

        {placed && (
          <div className="bg-emerald-50 border-b border-emerald-100 text-emerald-700 p-3 flex items-center gap-2 text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Pedido #{placed} criado com sucesso!
            <button onClick={() => setPlaced(null)} className="ml-auto underline text-xs">fechar</button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence initial={false}>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-stone-400 p-8 text-center">
                <ShoppingBag className="w-12 h-12 mb-4 opacity-20" />
                <p>Seu carrinho está vazio</p>
                <p className="text-sm mt-2">Adicione itens do menu para começar um pedido.</p>
              </div>
            ) : (
              cart.map(cartItem => {
                const item = items.find(i => i.id === cartItem.id);
                if (!item) return null;
                return (
                  <motion.div
                    key={cartItem.id}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex gap-4 p-3 bg-stone-50 rounded-xl border border-stone-100"
                  >
                    {item.image
                      ? <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                      : <div className="w-16 h-16 rounded-lg bg-orange-50 flex items-center justify-center text-orange-300"><ShoppingBag className="w-5 h-5" /></div>}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-stone-900 truncate">{item.name}</h4>
                      <p className="text-sm text-stone-500 mb-2">R$ {Number(item.price).toFixed(2)}</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(cartItem.id, -1)}
                          className="w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-medium w-4 text-center">{cartItem.quantity}</span>
                        <button
                          onClick={() => updateQuantity(cartItem.id, 1)}
                          className="w-6 h-6 rounded-full bg-white border border-stone-200 flex items-center justify-center hover:bg-stone-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(cartItem.id)}
                      className="text-stone-400 hover:text-red-500 self-start"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50">
          <div className="flex justify-between items-center mb-4">
            <span className="text-stone-500">Total</span>
            <span className="text-2xl font-bold font-display text-stone-900">R$ {cartTotal.toFixed(2)}</span>
          </div>
          <button
            disabled={cart.length === 0}
            onClick={() => setCheckout(true)}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-stone-200"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>

      {/* Checkout modal */}
      {checkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4" onClick={() => setCheckout(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-stone-900">Finalizar Pedido</h2>

            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Nome do cliente *</label>
              <input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                required />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Telefone</label>
              <input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Endereço de entrega</label>
              <input value={form.customer_address} onChange={e => setForm(f => ({ ...f, customer_address: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">Pagamento</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                <option value="pix">Pix</option>
                <option value="credit">Crédito</option>
                <option value="debit">Débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>

            <p className="text-sm text-stone-500">Itens: <strong className="text-stone-900">R$ {cartTotal.toFixed(2)}</strong></p>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setCheckout(false)}
                className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50">
                Cancelar
              </button>
              <button type="button" onClick={placeOrder} disabled={placing}
                className="flex-1 py-2.5 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center gap-2">
                {placing && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

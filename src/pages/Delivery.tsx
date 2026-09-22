import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, X, Loader2, CheckCircle2 } from 'lucide-react';
import { CATEGORIES } from '../hooks/useMenu';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useMenu } from '../hooks/useMenu';
import { useOrders } from '../hooks/useOrders';
import type { MenuItem } from '../lib/database.types';

export default function Delivery() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{id: number, quantity: number}[]>([]);
  const { items: menuItems, loading } = useMenu();
  const { createOrder } = useOrders();

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customer, setCustomer] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const cartItems = cart
    .map(cartItem => {
      const item = menuItems.find(i => i.id === cartItem.id);
      return item ? { item, quantity: cartItem.quantity } : null;
    })
    .filter((x): x is { item: MenuItem; quantity: number } => x !== null);

  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (id: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === id);
      if (existing) {
        return prev.map(item => item.id === id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { id, quantity: 1 }];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const newQuantity = Math.max(0, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const cartTotal = cart.reduce((total, cartItem) => {
    const item = menuItems.find(i => i.id === cartItem.id);
    return total + (item ? item.price * cartItem.quantity : 0);
  }, 0);

  const openCheckout = () => {
    setFeedback(null);
    setCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    if (!customer.trim()) {
      setFeedback({ message: 'Informe o nome do cliente para finalizar o pedido.', type: 'error' });
      return;
    }
    if (!address.trim()) {
      setFeedback({ message: 'Informe o endereço de entrega.', type: 'error' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await createOrder({
        customer: customer.trim(),
        customerPhone: phone.trim() || undefined,
        items: cartItems.map(({ item, quantity }) => ({ id: item.id, name: item.name, price: item.price, quantity })),
        total: cartTotal,
        address: address.trim(),
        paymentMethod,
        notes: notes.trim() || undefined
      });
      setCheckoutOpen(false);
      setCart([]);
      setCustomer('');
      setPhone('');
      setAddress('');
      setNotes('');
      setFeedback({ message: 'Pedido recebido! A cozinha já foi avisada.', type: 'success' });
    } catch (err) {
      setFeedback({ message: 'Erro ao enviar o pedido. Tente novamente.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-stone-500">Carregando cardápio...</div>
      </div>
    );
  }

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
            {CATEGORIES.map(cat => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <motion.div 
                key={item.id}
                layoutId={`product-${item.id}`}
                className="group bg-white rounded-xl border border-stone-100 hover:border-orange-200 hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
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
                    <span className="font-mono font-medium text-orange-600">R$ {item.price.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-stone-500 line-clamp-2 mb-4 flex-1">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
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
                const item = menuItems.find(i => i.id === cartItem.id);
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
                    <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-stone-900 truncate">{item.name}</h4>
                      <p className="text-sm text-stone-500 mb-2">R$ {item.price.toFixed(2)}</p>
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
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-stone-200"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>

      {/* Toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium shadow-lg text-white ${feedback.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
          >
            {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <X className="w-4 h-4" />}
            {feedback.message}
            <button onClick={() => setFeedback(null)} className="ml-2 text-white/70 hover:text-white"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkout modal */}
      <AnimatePresence>
        {checkoutOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setCheckoutOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold font-display text-stone-900">Finalizar Pedido</h3>
                <button onClick={() => !submitting && setCheckoutOpen(false)} className="text-stone-400 hover:text-stone-900"><X className="w-5 h-5" /></button>
              </div>

              <div className="mb-5 bg-stone-50 rounded-2xl p-4 space-y-1.5">
                {cartItems.map(({ item, quantity }) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-stone-600">{quantity}× {item.name}</span>
                    <span className="font-mono font-medium text-stone-900">R$ {(item.price * quantity).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-stone-200 font-bold text-stone-900">
                  <span>Total</span>
                  <span className="font-mono">R$ {cartTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Cliente *</label>
                  <input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Nome do cliente" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Telefone</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-9999" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Endereço de entrega *</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Rua, número, bairro e referência" className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Pagamento</label>
                  <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500">
                    <option value="pix">PIX</option>
                    <option value="credit">Cartão de Crédito</option>
                    <option value="debit">Cartão de Débito</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-2">Observações</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ex: sem cebola, tocar interfone..." className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-none" />
                </div>

                {feedback && feedback.type === 'error' && <p className="text-red-600 text-sm font-medium">{feedback.message}</p>}

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => !submitting && setCheckoutOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100">Cancelar</button>
                  <button
                    onClick={handleCheckout}
                    disabled={submitting}
                    className="bg-stone-900 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-stone-800 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    Enviar pedido — R$ {cartTotal.toFixed(2)}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

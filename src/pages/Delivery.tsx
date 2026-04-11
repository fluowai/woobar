import React, { useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Delivery() {
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<{id: number, quantity: number}[]>([]);

  const filteredItems = MENU_ITEMS.filter(item => {
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
    const item = MENU_ITEMS.find(i => i.id === cartItem.id);
    return total + (item ? item.price * cartItem.quantity : 0);
  }, 0);

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
                const item = MENU_ITEMS.find(i => i.id === cartItem.id);
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
            disabled={cart.length === 0}
            className="w-full py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-stone-200"
          >
            Finalizar Pedido
          </button>
        </div>
      </div>
    </div>
  );
}

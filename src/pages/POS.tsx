import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, CreditCard, Banknote, QrCode, Trash2, Plus, Minus, X, CheckCircle, Printer, History, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { SalesStore, SoldItem } from '../lib/store';

interface Product {
  id: string;
  name: string;
  price: number;
  category: 'drinks' | 'food' | 'portions';
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

const PRODUCTS: Product[] = [
  { id: '1', name: 'Heineken 600ml', price: 18.00, category: 'drinks' },
  { id: '2', name: 'Gin Tônica', price: 32.00, category: 'drinks' },
  { id: '3', name: 'Caipirinha', price: 25.00, category: 'drinks' },
  { id: '4', name: 'Água s/ Gás', price: 6.00, category: 'drinks' },
  { id: '5', name: 'Coca-Cola', price: 8.00, category: 'drinks' },
  { id: '6', name: 'Batata Frita', price: 28.00, category: 'portions' },
  { id: '7', name: 'Isca de Frango', price: 35.00, category: 'portions' },
  { id: '8', name: 'Hambúrguer Clássico', price: 38.00, category: 'food' },
  { id: '9', name: 'Pizza Margherita', price: 45.00, category: 'food' },
];

export default function POS() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | 'drinks' | 'food' | 'portions'>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<SoldItem[]>([]);
  const [recentSales, setRecentSales] = useState<SoldItem[]>([]);

  const filteredProducts = PRODUCTS.filter(p => 
    (category === 'all' || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openHistory = () => {
    const items = SalesStore.getItems().reverse(); // Show newest first
    setRecentSales(items);
    setIsHistoryOpen(true);
  };

  const handlePayment = (method: 'card' | 'cash' | 'pix') => {
    // Generate codes for each item in the cart
    const newCodes: SoldItem[] = [];
    
    cart.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        const code = Math.floor(1000 + Math.random() * 9000).toString();
        const soldItem = {
          code,
          itemName: item.name,
          price: item.price,
          type: item.category === 'drinks' ? 'token' as const : 'ticket' as const, // Simplified logic
          purchaseTime: new Date().toLocaleString('pt-BR'),
          status: 'valid' as const
        };
        
        // Save to store
        const savedItem = SalesStore.addItem(soldItem);
        newCodes.push(savedItem);
      }
    });

    setGeneratedCodes(newCodes);
    setIsPaymentModalOpen(false);
    setIsSuccessModalOpen(true);
    setCart([]); // Clear cart
  };

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-stone-50 overflow-hidden">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col p-6 gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold font-display text-stone-900">Ponto de Venda</h1>
            <p className="text-stone-500">Selecione os produtos para adicionar ao pedido</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={openHistory}
              className="p-3 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm"
              title="Histórico de Vendas"
            >
              <History className="w-5 h-5" />
            </button>
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input 
                type="text" 
                placeholder="Buscar produtos..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-stone-200 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 pb-2 overflow-x-auto">
          {['all', 'drinks', 'food', 'portions'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat as any)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold capitalize transition-all",
                category === cat 
                  ? "bg-stone-900 text-white shadow-md" 
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              )}
            >
              {cat === 'all' ? 'Todos' : cat === 'drinks' ? 'Bebidas' : cat === 'food' ? 'Lanches' : 'Porções'}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pb-20">
          {filteredProducts.map((product) => (
            <motion.button
              key={product.id}
              layoutId={`product-${product.id}`}
              onClick={() => addToCart(product)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-32"
            >
              <span className="font-bold text-stone-800 line-clamp-2">{product.name}</span>
              <div className="flex justify-between items-end">
                <span className="text-lg font-mono font-bold text-stone-900">
                  R$ {product.price.toFixed(2)}
                </span>
                <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-600">
                  <Plus className="w-4 h-4" />
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-stone-200 flex flex-col shadow-xl z-20">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h2 className="text-xl font-bold font-display flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Carrinho
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 opacity-50">
              <ShoppingCart className="w-12 h-12 mb-2" />
              <p>Carrinho vazio</p>
            </div>
          ) : (
            cart.map((item) => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl border border-stone-100"
              >
                <div className="flex-1">
                  <h4 className="font-bold text-sm text-stone-800">{item.name}</h4>
                  <p className="text-xs text-stone-500 font-mono">R$ {item.price.toFixed(2)}</p>
                </div>
                
                <div className="flex items-center gap-2 bg-white rounded-lg border border-stone-200 p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-stone-100 rounded"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-4 text-center text-sm font-bold">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-6 h-6 flex items-center justify-center hover:bg-stone-100 rounded"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-red-400 hover:text-red-600 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))
          )}
        </div>

        <div className="p-6 bg-stone-50 border-t border-stone-200">
          <div className="flex justify-between items-center mb-6">
            <span className="text-stone-500 font-medium">Total</span>
            <span className="text-3xl font-bold font-mono text-stone-900">
              R$ {total.toFixed(2)}
            </span>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold text-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center gap-2"
          >
            Finalizar Venda
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold font-display">Pagamento</h2>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-8 grid grid-cols-2 gap-4">
                <button onClick={() => handlePayment('card')} className="p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group">
                  <CreditCard className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">Cartão</span>
                </button>
                <button onClick={() => handlePayment('cash')} className="p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group">
                  <Banknote className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">Dinheiro</span>
                </button>
                <button onClick={() => handlePayment('pix')} className="p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group">
                  <QrCode className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">PIX</span>
                </button>
              </div>

              <div className="p-6 bg-stone-50 text-center border-t border-stone-100">
                <p className="text-stone-500 mb-2">Total a pagar</p>
                <p className="text-4xl font-bold font-mono text-stone-900">R$ {total.toFixed(2)}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {isSuccessModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-bold font-display text-stone-900 mb-2">Venda Realizada!</h2>
                <p className="text-stone-500 mb-8">Fichas geradas com sucesso.</p>

                <div className="bg-stone-50 rounded-2xl p-4 border border-stone-100 mb-8 max-h-60 overflow-y-auto">
                  {generatedCodes.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-3 border-b border-stone-200 last:border-0">
                      <div className="text-left">
                        <span className="font-bold text-stone-800 block">{item.itemName}</span>
                        <span className="text-xs text-stone-400 font-mono">#{item.code}</span>
                      </div>
                      <div className="bg-stone-900 text-white px-3 py-1 rounded-lg font-mono font-bold text-lg tracking-widest">
                        {item.code}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsSuccessModalOpen(false)}
                    className="flex-1 py-3 bg-stone-100 text-stone-600 rounded-xl font-bold hover:bg-stone-200 transition-colors"
                  >
                    Fechar
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center">
                <h2 className="text-2xl font-bold font-display flex items-center gap-2">
                  <History className="w-6 h-6 text-stone-400" />
                  Histórico de Vendas
                </h2>
                <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {recentSales.length === 0 ? (
                  <div className="text-center py-12 opacity-50">
                    <History className="w-12 h-12 mx-auto mb-2" />
                    <p>Nenhuma venda recente</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentSales.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-stone-50 rounded-xl border border-stone-100">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            item.status === 'valid' ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"
                          )}>
                            {item.status === 'valid' ? <CheckCircle className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                          </div>
                          <div>
                            <span className="font-bold text-stone-900 block">{item.itemName}</span>
                            <div className="flex items-center gap-2 text-xs text-stone-500">
                              <span className="font-mono">#{item.code}</span>
                              <span>•</span>
                              <span>{item.purchaseTime}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-stone-900 block">R$ {item.price.toFixed(2)}</span>
                          <span className={cn(
                            "text-xs font-bold uppercase tracking-wider",
                            item.status === 'valid' ? "text-emerald-600" : "text-orange-600"
                          )}>
                            {item.status === 'valid' ? 'Válido' : 'Utilizado'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

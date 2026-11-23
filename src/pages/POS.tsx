import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ShoppingCart, CreditCard, Banknote, QrCode, Trash2, Plus, Minus, X, CheckCircle, Printer, History, Clock, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function POS() {
  const { items: menuItems, loading: menuLoading } = useMenu();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [printMessage, setPrintMessage] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.getProducts();
      setProducts((Array.isArray(data) ? data : []).map((p: any) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price) || 0,
        category: p.category_name || 'Outros',
        image: p.image || undefined,
      })));
    } catch (e: any) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  const categoryList = ['all', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = products.filter(p =>
    (category === 'all' || p.category === category) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const isDrink = (p: Product) => /bebida|drink|cerveja|destilado/i.test(p.category);

  const openHistory = async () => {
    setIsHistoryOpen(true);
    try {
      const res = await api.getTokens();
      setRecentSales((Array.isArray(res) ? res : []).map((t: any) => ({
        code: t.code,
        itemName: t.item_name,
        price: Number(t.price) || 0,
        purchaseTime: new Date(t.created_at).toLocaleString('pt-BR'),
        status: t.status,
        type: t.type,
      })));
    } catch (e: any) {
      setRecentSales([]);
      setPaymentError(e.message || 'Falha ao carregar histórico');
    }
  };

  const handlePayment = async (method: 'card' | 'cash' | 'pix') => {
    setIsProcessing(true);
    setPaymentError('');
    try {
      const items = cart.map(item => ({
        product_id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        type: isDrink(item) ? 'token' : 'ticket',
      }));

      const res = await api.sellTokens({ items, payment_method: method });
      setGeneratedCodes((res.codes || []).map((c: any) => ({
        code: c.code,
        itemName: c.item_name,
        price: Number(c.price) || 0,
        type: 'token' as const,
      })));
      setPrintMessage(res.print_jobs?.length ? 'Fichas enviadas para a fila de impressão.' : 'Impressão automática desativada. Use Reimprimir para enviar.');
      setIsPaymentModalOpen(false);
      setIsSuccessModalOpen(true);
      setCart([]);
    } catch (e: any) {
      setPaymentError(e.message || 'Falha ao processar pagamento');
    } finally {
      setIsProcessing(false);
    }
  };

  const printGeneratedCodes = async () => {
    setIsProcessing(true);
    try {
      await Promise.all(generatedCodes.map(item => api.printToken(item.code)));
      setPrintMessage('Fichas enviadas para a fila de impressão.');
    } catch (e: any) { setPrintMessage(e.message || 'Falha ao enviar para impressão.'); }
    finally { setIsProcessing(false); }
  };

  const handleCreatePixCharge = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const charge = await createPixCharge(total, `Venda POS - ${cart.reduce((acc, c) => acc + c.quantity, 0) || 1} itens`);
      setPixCharge(charge);
      setPollingPix(true);
      pollPixStatus(charge.id, charge.provider);
    } catch (err: any) {
      alert(err.message || 'Erro ao criar cobrança PIX. Verifique as integrações.');
      setIsPixQRModalOpen(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const pollPixStatus = async (chargeId: string, provider: string) => {
    const maxAttempts = 60;
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      const status = await checkPixStatus(chargeId, provider);

      if (status === 'approved') {
        clearInterval(interval);
        setPollingPix(false);
        await finalizeSale('pix');
      } else if (status === 'expired' || status === 'cancelled') {
        clearInterval(interval);
        setPollingPix(false);
        setPixCharge(prev => prev ? { ...prev, status } : prev);
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
        setPollingPix(false);
      }
    }, 3000);
  };

  const addToCart = (product: MenuItem) => {
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

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  const total = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] bg-stone-50 lg:overflow-hidden">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col p-3 md:p-6 gap-4 md:gap-6 min-w-0">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-display text-stone-900">Ponto de Venda</h1>
            <p className="text-stone-500 text-sm md:text-base">Selecione os produtos para adicionar ao pedido</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={openHistory}
              className="p-3 rounded-xl bg-white border border-stone-200 text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors shadow-sm w-fit"
              title="Histórico de Vendas"
            >
              <History className="w-5 h-5" />
            </button>
            <div className="relative flex-1 md:w-80">
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

        <div className="flex gap-2 pb-2 overflow-x-auto">
          {categoryList.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold capitalize transition-all whitespace-nowrap",
                category === cat
                  ? "bg-stone-900 text-white shadow-md"
                  : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
              )}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:overflow-y-auto pb-6 lg:pb-20">
          {loading ? (
            <div className="col-span-full flex flex-col items-center gap-3 text-stone-400 py-16">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Carregando produtos...</span>
            </div>
          ) : loadError ? (
            <div className="col-span-full flex flex-col items-center gap-4 py-16 text-center">
              <p className="text-sm text-red-600">{loadError}</p>
              <button onClick={loadProducts} className="px-4 py-2 bg-stone-900 text-white rounded-xl text-sm font-medium">Tentar novamente</button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-stone-400 py-16 text-sm">Nenhum produto encontrado</div>
          ) : filteredProducts.map((product) => (
            <motion.button
              key={product.id}
              layoutId={`product-${product.id}`}
              onClick={() => addToCart(product)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-white p-3 md:p-4 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all text-left flex flex-col justify-between h-28 md:h-32"
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
      <div className="w-full lg:w-96 bg-white border-t lg:border-t-0 lg:border-l border-stone-200 flex flex-col shadow-xl z-20 min-h-[420px] lg:min-h-0">
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
            disabled={cart.length === 0 || isProcessing}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold text-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center gap-2"
          >
            {isProcessing ? 'Processando...' : 'Finalizar Venda'}
          </button>
        </div>
      </div>

      {/* Carrinho Mobile Modal */}
      <AnimatePresence>
        {isCartOpen && (
          <motion.div className="md:hidden fixed inset-0 z-50 flex flex-col">
            <div className="absolute inset-0 bg-black/50" onClick={() => setIsCartOpen(false)} />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="relative bg-white mt-auto rounded-t-3xl h-[80vh] flex flex-col"
            >
              <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
                <h2 className="text-xl font-bold font-display flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Carrinho
                </h2>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-stone-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
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
                  disabled={cart.length === 0 || isProcessing}
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsPaymentModalOpen(true);
                  }}
                  className="w-full py-4 bg-stone-900 text-white rounded-xl font-bold text-lg hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-900/20 flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Processando...' : 'Finalizar Venda'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                <button 
                  onClick={() => handlePayment('card')} 
                  disabled={isProcessing}
                  className="p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group disabled:opacity-50"
                >
                  <CreditCard className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">Cartão</span>
                </button>
                <button 
                  onClick={() => handlePayment('cash')} 
                  disabled={isProcessing}
                  className="p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group disabled:opacity-50"
                >
                  <Banknote className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">Dinheiro</span>
                </button>
                <button 
                  onClick={() => handlePayment('pix')} 
                  disabled={isProcessing}
                  className="col-span-2 p-6 rounded-2xl bg-stone-50 border-2 border-stone-100 hover:border-stone-900 hover:bg-stone-100 transition-all flex flex-col items-center gap-3 group disabled:opacity-50"
                >
                  <QrCode className="w-8 h-8 text-stone-400 group-hover:text-stone-900" />
                  <span className="font-bold text-stone-600 group-hover:text-stone-900">PIX</span>
                </button>
              </div>

              <div className="p-6 bg-stone-50 text-center border-t border-stone-100">
                <p className="text-stone-500 mb-2">Total a pagar</p>
                <p className="text-4xl font-bold font-mono text-stone-900">R$ {total.toFixed(2)}</p>
                {paymentError && (
                  <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">
                    {paymentError}
                    <button onClick={() => setIsPaymentModalOpen(false)} className="ml-2 underline font-bold">fechar</button>
                  </p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPixQRModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-teal-50">
                <h2 className="text-xl font-bold font-display text-teal-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5" /> PIX Digital
                </h2>
                <button onClick={() => { setIsPixQRModalOpen(false); setPixCharge(null); setPollingPix(false); }} className="p-2 hover:bg-teal-100 rounded-full text-teal-900">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 flex flex-col items-center text-center">
                <p className="text-stone-500 mb-4 font-bold uppercase text-xs tracking-wider">Valor da Cobrança</p>
                <h2 className="text-4xl font-mono font-bold text-stone-900 mb-6 truncate">R$ {total.toFixed(2)}</h2>

                {pixCharge ? (
                  <>
                    <div className="w-48 h-48 bg-stone-100 p-2 rounded-2xl shadow-sm border border-stone-200 mb-3 flex items-center justify-center overflow-hidden">
                      {pixCharge.qrCodeImage ? (
                        <img src={pixCharge.qrCodeImage} alt="QR Code PIX" className="w-full h-full object-contain" />
                      ) : (
                        <QrCode className="w-24 h-24 text-stone-900" />
                      )}
                    </div>
                    <p className="text-xs text-stone-500 mb-4 break-all px-2">{pixCharge.copyPaste}</p>
                    {pollingPix && (
                      <p className="text-xs text-teal-600 font-medium animate-pulse">Aguardando pagamento PIX...</p>
                    )}
                    <p className="text-[10px] text-stone-400 mb-4">Escaneie o código com o app do seu banco ou cole a chave acima.</p>
                  </>
                ) : (
                  <>
                    <div className="w-48 h-48 bg-stone-100 p-2 rounded-2xl shadow-sm border border-stone-200 mb-6 flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-stone-900" />
                    </div>
                    <p className="text-sm text-stone-500 mb-6">Clique para gerar a cobrança PIX.</p>
                    <button
                      onClick={handleCreatePixCharge}
                      disabled={isProcessing}
                      className="w-full bg-teal-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all hover:bg-teal-600"
                    >
                      {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Gerar Cobrança PIX'}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                {printMessage && <p className="text-sm bg-blue-50 text-blue-700 border border-blue-100 rounded-xl p-3 mb-4">{printMessage}</p>}

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
                    onClick={printGeneratedCodes}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4" />
                    {isProcessing ? 'Enviando...' : 'Reimprimir'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
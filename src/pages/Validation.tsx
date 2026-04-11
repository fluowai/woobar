import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Ticket, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { SalesStore } from '../lib/store';

type ValidationType = 'token' | 'ticket';

interface ValidationResult {
  status: 'valid' | 'invalid' | 'used';
  message: string;
  details?: {
    item: string;
    value: string;
    timestamp?: string;
  };
}

export default function Validation() {
  const [activeTab, setActiveTab] = useState<ValidationType>('token');
  const [code, setCode] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleValidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setResult(null);

    // Simulate API call
    setTimeout(() => {
      const item = SalesStore.validateCode(code);

      if (!item) {
        setResult({
          status: 'invalid',
          message: 'Código não encontrado',
        });
      } else if (item.status === 'used') {
        setResult({
          status: 'used',
          message: 'Este código já foi utilizado',
          details: {
            item: item.itemName,
            value: `R$ ${item.price.toFixed(2)}`,
            timestamp: item.purchaseTime
          }
        });
      } else {
        // Mark as used
        SalesStore.markAsUsed(code);
        setResult({
          status: 'valid',
          message: 'Código Válido!',
          details: {
            item: item.itemName,
            value: `R$ ${item.price.toFixed(2)}`,
          }
        });
      }
      setIsLoading(false);
    }, 800);
  };

  const reset = () => {
    setCode('');
    setResult(null);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold font-display text-stone-900 mb-2">Validação</h1>
        <p className="text-stone-500">Confira a validade de fichas e ingressos</p>
      </div>

      <div className="bg-white p-1 rounded-2xl border border-stone-200 shadow-sm flex mb-8 w-full max-w-md">
        <button
          onClick={() => { setActiveTab('token'); reset(); }}
          className={cn(
            "flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'token' 
              ? "bg-stone-900 text-white shadow-md" 
              : "text-stone-500 hover:bg-stone-50"
          )}
        >
          <QrCode className="w-4 h-4" />
          Fichas de Bar
        </button>
        <button
          onClick={() => { setActiveTab('ticket'); reset(); }}
          className={cn(
            "flex-1 py-3 px-6 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2",
            activeTab === 'ticket' 
              ? "bg-stone-900 text-white shadow-md" 
              : "text-stone-500 hover:bg-stone-50"
          )}
        >
          <Ticket className="w-4 h-4" />
          Ingressos
        </button>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-stone-100 overflow-hidden relative">
        <div className="p-8">
          <form onSubmit={handleValidate} className="relative mb-6">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={activeTab === 'token' ? "Digite o código da ficha..." : "Digite o código do ingresso..."}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-stone-50 border-2 border-stone-100 focus:border-stone-900 focus:ring-0 transition-all text-lg font-mono text-center uppercase tracking-widest"
              autoFocus
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 w-6 h-6" />
            {activeTab === 'token' && (
              <button
                type="submit"
                className="w-full mt-4 py-3 bg-stone-900 text-white rounded-xl font-bold hover:bg-stone-800 transition-colors shadow-md"
              >
                Validar Ficha
              </button>
            )}
          </form>

          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <RefreshCw className="w-12 h-12 text-stone-300 animate-spin mb-4" />
                <p className="text-stone-400 font-medium">Verificando...</p>
              </motion.div>
            ) : result ? (
              <motion.div
                key="result"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className={cn(
                  "rounded-2xl p-6 text-center border-2",
                  result.status === 'valid' ? "bg-emerald-50 border-emerald-100" :
                  result.status === 'used' ? "bg-orange-50 border-orange-100" :
                  "bg-red-50 border-red-100"
                )}
              >
                <div className={cn(
                  "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4",
                  result.status === 'valid' ? "bg-emerald-100 text-emerald-600" :
                  result.status === 'used' ? "bg-orange-100 text-orange-600" :
                  "bg-red-100 text-red-600"
                )}>
                  {result.status === 'valid' ? <CheckCircle className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
                </div>
                
                <h3 className={cn(
                  "text-2xl font-bold mb-2",
                  result.status === 'valid' ? "text-emerald-800" :
                  result.status === 'used' ? "text-orange-800" :
                  "text-red-800"
                )}>
                  {result.message}
                </h3>

                {result.details && (
                  <div className="mt-4 pt-4 border-t border-black/5 text-left space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm opacity-60">Item:</span>
                      <span className="font-bold">{result.details.item}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm opacity-60">Valor/Lote:</span>
                      <span className="font-mono font-bold">{result.details.value}</span>
                    </div>
                    {result.details.timestamp && (
                      <div className="flex justify-between text-orange-700 bg-orange-100/50 px-2 py-1 rounded">
                        <span className="text-xs font-bold">Utilizado em:</span>
                        <span className="text-xs font-mono">{result.details.timestamp}</span>
                      </div>
                    )}
                  </div>
                )}

                <button 
                  onClick={reset}
                  className="mt-6 w-full py-3 bg-white border border-stone-200 rounded-xl font-bold text-stone-600 hover:bg-stone-50 transition-colors shadow-sm"
                >
                  Nova Verificação
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12 opacity-30"
              >
                <QrCode className="w-24 h-24 mx-auto mb-4" />
                <p className="font-medium">Aguardando leitura...</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

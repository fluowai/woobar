import React, { useEffect, useState } from 'react';
import { Users, UserPlus, UserMinus, CreditCard, Banknote, QrCode, Settings, CheckCircle, History, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';

type Transaction = {
  id: string;
  type: 'entry' | 'exit';
  amount: number;
  method: string | null;
  created_at: string;
};

export default function CoverCharge() {
  const [count, setCount] = useState(0);
  const [capacity, setCapacity] = useState(250);
  const [price, setPrice] = useState(25.00);
  const [priceDirty, setPriceDirty] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'pix'>('pix');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalToday, setTotalToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const [cfg, countRes, txRes] = await Promise.all([
        api.getCoverConfig(),
        api.getCoverCount(),
        api.getCoverTransactions(),
      ]);
      if (cfg && Object.keys(cfg).length) {
        setPrice(Number(cfg.price) || 25);
        setCapacity(Number(cfg.capacity) || 250);
      }
      setCount(countRes?.current ?? 0);
      if (countRes?.capacity) setCapacity(countRes.capacity);
      setTransactions(Array.isArray(txRes?.transactions) ? txRes.transactions : []);
      setTotalToday(Number(txRes?.total_today) || 0);
    } catch (e) {
      toast.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Salva o preço quando alterado (botões +/-)
  const changePrice = async (delta: number) => {
    const next = Math.max(0, price + delta);
    setPrice(next);
    setPriceDirty(true);
    try {
      await api.updateCoverConfig({ price: next, capacity });
      setPriceDirty(false);
    } catch (e) {
      toast.error(e);
    }
  };

  const handleCheckIn = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await api.coverEntry(price, paymentMethod);
      setCount(c => c + 1);
      setTransactions(prev => [{
        id: res?.id || String(Date.now()),
        type: 'entry',
        amount: Number(res?.amount ?? price),
        method: paymentMethod,
        created_at: new Date().toISOString(),
      }, ...prev]);
      setTotalToday(t => t + Number(res?.amount ?? price));
      setLastAction(`Entrada registrada: R$ ${Number(res?.amount ?? price).toFixed(2)} (${paymentMethod.toUpperCase()})`);
      setTimeout(() => setLastAction(null), 3000);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleCheckOut = async () => {
    if (busy || count <= 0) return;
    setBusy(true);
    try {
      const res = await api.coverExit();
      setCount(c => Math.max(0, c - 1));
      setTransactions(prev => [{
        id: res?.id || String(Date.now()),
        type: 'exit',
        amount: 0,
        method: null,
        created_at: new Date().toISOString(),
      }, ...prev]);
      setLastAction('Saída registrada');
      setTimeout(() => setLastAction(null), 3000);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };

  const occupancyPercentage = capacity > 0 ? (count / capacity) * 100 : 0;
  let statusColor = 'bg-emerald-500';
  if (occupancyPercentage > 70) statusColor = 'bg-orange-500';
  if (occupancyPercentage > 90) statusColor = 'bg-red-500';

  if (loading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-stone-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Carregando couvert...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      {/* Main Control Panel */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Occupancy Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 flex flex-col items-center justify-center relative overflow-hidden flex-1 min-h-[300px]">
          <div className={`absolute top-0 left-0 w-full h-2 ${statusColor}`} />

          <h2 className="text-stone-500 font-medium uppercase tracking-widest mb-4">Lotação Atual</h2>

          <div className="relative mb-6">
            <svg className="w-64 h-64 transform -rotate-90">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-stone-100"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 120}
                strokeDashoffset={2 * Math.PI * 120 * (1 - occupancyPercentage / 100)}
                className={`${statusColor.replace('bg-', 'text-')} transition-all duration-1000 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-6xl font-bold font-display text-stone-900">{count}</span>
              <span className="text-stone-400 font-medium">/ {capacity}</span>
            </div>
          </div>

          <div className="flex gap-8 text-center">
            <div>
              <p className="text-xs text-stone-400 uppercase font-bold">Disponível</p>
              <p className="text-xl font-bold text-stone-700">{Math.max(0, capacity - count)}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase font-bold">Ocupação</p>
              <p className={`text-xl font-bold ${statusColor.replace('bg-', 'text-')}`}>
                {occupancyPercentage.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-6 h-32">
          <button
            onClick={handleCheckOut}
            disabled={busy || count <= 0}
            className="bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-2 border-transparent hover:border-stone-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserMinus className="w-8 h-8" />
            <span className="text-lg font-bold">Registrar Saída</span>
          </button>

          <button
            onClick={handleCheckIn}
            disabled={busy || count >= capacity}
            className="bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserPlus className="w-8 h-8" />
            <span className="text-lg font-bold">Registrar Entrada</span>
          </button>
        </div>
      </div>

      {/* Settings & History Sidebar */}
      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-500" />
            Configuração & Histórico
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Price Setting */}
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-2">Valor do Couvert</label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => changePrice(-5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 font-bold text-lg"
                >
                  -
                </button>
                <div className="flex-1 text-center py-2 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-2xl font-bold font-display text-stone-900">R$ {price.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => changePrice(5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 font-bold text-lg"
                >
                  +
                </button>
              </div>
              {priceDirty && <p className="text-xs text-orange-500 mt-2">Salvando alteração...</p>}
            </div>

            {/* Payment Method */}
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'pix', icon: QrCode, label: 'Pix' },
                  { id: 'credit', icon: CreditCard, label: 'Crédito' },
                  { id: 'debit', icon: CreditCard, label: 'Débito' },
                  { id: 'cash', icon: Banknote, label: 'Dinheiro' },
                ].map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setPaymentMethod(method.id as any)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all text-sm font-medium",
                      paymentMethod === method.id
                        ? "bg-stone-900 text-white border-stone-900 shadow-md"
                        : "bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50"
                    )}
                  >
                    <method.icon className="w-4 h-4" />
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction History */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-stone-500">Últimas Transações</label>
                <History className="w-4 h-4 text-stone-400" />
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {lastAction && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-emerald-700 mb-4"
                    >
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="font-medium text-sm">{lastAction}</span>
                    </motion.div>
                  )}
                  {transactions.slice(0, 8).map((t) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex justify-between items-center p-3 bg-stone-50 rounded-xl border border-stone-100 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          t.type === 'entry' ? "bg-emerald-500" : "bg-red-500"
                        )} />
                        <span className="text-stone-600">
                          {t.type === 'entry' ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="block font-medium text-stone-900">
                          {t.type === 'entry' ? `+ R$ ${Number(t.amount || 0).toFixed(2)}` : '-'}
                        </span>
                        <span className="text-xs text-stone-400 uppercase">{t.method || '-'}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {transactions.length === 0 && (
                  <p className="text-center text-stone-400 text-sm py-4">Nenhuma transação registrada hoje</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-stone-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Total Arrecadado Hoje</span>
            </div>
            <span className="font-bold text-stone-900 text-xl font-display">R$ {Number(totalToday).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

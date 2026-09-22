import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, UserMinus, CreditCard, Banknote, QrCode, Settings, CheckCircle, History, TrendingUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';

const CAPACITY = 250;

interface Transaction {
  id: number;
  type: string;
  amount: number;
  method: string;
  timestamp: string;
}

export default function CoverCharge() {
  const [count, setCount] = useState(0);
  const [price, setPrice] = useState(25.00);
  const [paymentMethod, setPaymentMethod] = useState<'credit' | 'debit' | 'cash' | 'pix'>('pix');
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const [txResult, occResult] = await Promise.all([
        supabase
          .from('cover_charge_transactions')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(50),
        supabase
          .from('cover_charge_transactions')
          .select('type, timestamp')
          .gte('timestamp', today)
      ]);

      if (txResult.data) {
        setTransactions(txResult.data.map((t: any) => ({
          id: t.id,
          type: t.type,
          amount: t.amount,
          method: t.method,
          timestamp: t.timestamp
        })));
      }

      if (occResult.data) {
        let occupancy = 0;
        occResult.data.forEach((t: any) => {
          if (t.type === 'entry') occupancy++;
          else if (t.type === 'exit') occupancy--;
        });
        setCount(Math.max(0, occupancy));
      }
    } catch (err) {
      console.error('Error fetching cover charge data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckIn = async () => {
    if (count >= CAPACITY || processing) return;
    setProcessing(true);

    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .insert({
          tenant_id: tenantId,
          type: 'entry',
          amount: price,
          method: paymentMethod,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCount(c => c + 1);
      setTransactions(prev => [{
        id: data.id,
        type: 'entry',
        amount: price,
        method: paymentMethod,
        timestamp: new Date().toISOString()
      }, ...prev]);
      setLastAction(`Entrada registrada: R$ ${price.toFixed(2)} (${paymentMethod.toUpperCase()})`);
      setTimeout(() => setLastAction(null), 3000);
    } catch (err) {
      console.error('Error recording entry:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckOut = async () => {
    if (count <= 0 || processing) return;
    setProcessing(true);

    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .insert({
          tenant_id: tenantId,
          type: 'exit',
          amount: 0,
          method: 'cash',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setCount(c => Math.max(0, c - 1));
      setTransactions(prev => [{
        id: data.id,
        type: 'exit',
        amount: 0,
        method: '-',
        timestamp: new Date().toISOString()
      }, ...prev]);
      setLastAction('Saída registrada');
      setTimeout(() => setLastAction(null), 3000);
    } catch (err) {
      console.error('Error recording exit:', err);
    } finally {
      setProcessing(false);
    }
  };

  const occupancyPercentage = (count / CAPACITY) * 100;
  let statusColor = 'bg-emerald-500';
  if (occupancyPercentage > 70) statusColor = 'bg-orange-500';
  if (occupancyPercentage > 90) statusColor = 'bg-red-500';

  const totalRevenue = transactions
    .filter(t => t.type === 'entry')
    .reduce((acc, curr) => acc + curr.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="w-8 h-8 text-stone-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-8rem)] gap-6">
      <div className="flex-1 flex flex-col gap-6">
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
              <span className="text-stone-400 font-medium">/ {CAPACITY}</span>
            </div>
          </div>

          <div className="flex gap-8 text-center">
            <div>
              <p className="text-xs text-stone-400 uppercase font-bold">Disponível</p>
              <p className="text-xl font-bold text-stone-700">{CAPACITY - count}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400 uppercase font-bold">Ocupação</p>
              <p className={`text-xl font-bold ${statusColor.replace('bg-', 'text-')}`}>
                {occupancyPercentage.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 h-32">
          <button
            onClick={handleCheckOut}
            disabled={processing || count <= 0}
            className="bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-2 border-transparent hover:border-stone-300 disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-8 h-8 animate-spin" /> : <UserMinus className="w-8 h-8" />}
            <span className="text-lg font-bold">Registrar Saída</span>
          </button>
          
          <button
            onClick={handleCheckIn}
            disabled={count >= CAPACITY || processing}
            className="bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? <Loader2 className="w-8 h-8 animate-spin" /> : <UserPlus className="w-8 h-8" />}
            <span className="text-lg font-bold">Registrar Entrada</span>
          </button>
        </div>
      </div>

      <div className="w-full lg:w-96 bg-white rounded-2xl shadow-sm border border-stone-100 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-stone-100 bg-stone-50/50">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-500" />
            Configuração & Histórico
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div>
              <label className="block text-sm font-medium text-stone-500 mb-2">Valor do Couvert</label>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPrice(p => Math.max(0, p - 5))}
                  className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 font-bold text-lg"
                >
                  -
                </button>
                <div className="flex-1 text-center py-2 bg-stone-50 rounded-xl border border-stone-200">
                  <span className="text-2xl font-bold font-display text-stone-900">R$ {price.toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => setPrice(p => p + 5)}
                  className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center hover:bg-stone-200 font-bold text-lg"
                >
                  +
                </button>
              </div>
            </div>

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
                  {transactions.slice(0, 5).map((t) => (
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
                          {t.type === 'entry' ? `+ R$ ${Number(t.amount).toFixed(2)}` : '-'}
                        </span>
                        <span className="text-xs text-stone-400 uppercase">{t.method}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {transactions.length === 0 && (
                  <p className="text-center text-stone-400 text-sm py-4">Nenhuma transação registrada</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-stone-100 bg-stone-50">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-stone-500">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">Total Arrecadado</span>
            </div>
            <span className="font-bold text-stone-900 text-xl font-display">R$ {totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

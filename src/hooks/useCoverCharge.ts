import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface CoverChargeTransaction {
  id?: number;
  type: 'entry' | 'exit';
  amount: number;
  method: 'pix' | 'credit' | 'debit' | 'cash';
  timestamp: string;
}

export function useCoverCharge() {
  const [transactions, setTransactions] = useState<CoverChargeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOccupancy, setCurrentOccupancy] = useState(0);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      setTransactions(data as CoverChargeTransaction[] || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOccupancy = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .select('type, timestamp')
        .gte('timestamp', today);

      if (error) throw error;
      
      const txs = data as CoverChargeTransaction[];
      let count = 0;
      txs.forEach(t => {
        if (t.type === 'entry') count++;
        else if (t.type === 'exit') count--;
      });
      setCurrentOccupancy(Math.max(0, count));
    } catch (err) {
      console.error('Error fetching occupancy:', err);
    }
  }, []);

  const recordEntry = useCallback(async (amount: number, method: 'pix' | 'credit' | 'debit' | 'cash') => {
    try {
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .insert({
          type: 'entry',
          amount,
          method,
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => [data as CoverChargeTransaction, ...prev]);
      setCurrentOccupancy(prev => prev + 1);
      return data as CoverChargeTransaction;
    } catch (err) {
      console.error('Error recording entry:', err);
      throw err;
    }
  }, []);

  const recordExit = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .insert({
          type: 'exit',
          amount: 0,
          method: 'cash',
          timestamp: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setTransactions(prev => [data as CoverChargeTransaction, ...prev]);
      setCurrentOccupancy(prev => Math.max(0, prev - 1));
      return data as CoverChargeTransaction;
    } catch (err) {
      console.error('Error recording exit:', err);
      throw err;
    }
  }, []);

  const getTodayRevenue = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('cover_charge_transactions')
        .select('amount')
        .eq('type', 'entry')
        .gte('timestamp', today);

      if (error) throw error;
      const entries = data as { amount: number }[];
      return entries.reduce((acc, t) => acc + t.amount, 0);
    } catch (err) {
      console.error('Error fetching revenue:', err);
      return 0;
    }
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchOccupancy();
  }, [fetchTransactions, fetchOccupancy]);

  return {
    transactions,
    loading,
    currentOccupancy,
    refetch: fetchTransactions,
    recordEntry,
    recordExit,
    getTodayRevenue
  };
}
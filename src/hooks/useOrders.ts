import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

export interface OrderItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customer: string;
  customerPhone?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  time: string;
  address: string;
  location?: { lat: number; lng: number };
  courierId?: string;
  paymentMethod?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[] || []);
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getByStatus = useCallback(async (status: OrderStatus) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Order[] || [];
    } catch (err) {
      console.error('Error fetching orders by status:', err);
      throw err;
    }
  }, []);

  const createOrder = useCallback(async (order: Omit<Order, 'id' | 'status' | 'time' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          ...order,
          status: 'pending',
          time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setOrders(prev => [data as Order, ...prev]);
      return data as Order;
    } catch (err) {
      console.error('Error creating order:', err);
      throw err;
    }
  }, []);

  const updateStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          status,
          updatedAt: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      return data as Order;
    } catch (err) {
      console.error('Error updating order status:', err);
      throw err;
    }
  }, []);

  const assignCourier = useCallback(async (orderId: string, courierId: string) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update({ 
          courierId,
          updatedAt: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, courierId } : o));
      return data as Order;
    } catch (err) {
      console.error('Error assigning courier:', err);
      throw err;
    }
  }, []);

  const updateOrder = useCallback(async (orderId: string, updates: Partial<Order>) => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updates } : o));
      return data as Order;
    } catch (err) {
      console.error('Error updating order:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    getByStatus,
    createOrder,
    updateStatus,
    assignCourier,
    updateOrder
  };
}
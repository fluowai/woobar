import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';

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
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('orders')
        .insert({
          id: crypto.randomUUID(),
          tenant_id: tenantId,
          customer: order.customer,
          customer_phone: order.customerPhone || null,
          items: order.items,
          total: order.total,
          status: 'pending',
          time: new Date().toISOString(),
          address: order.address || null,
          location: order.location || null,
          courier_id: order.courierId || null,
          payment_method: order.paymentMethod || null,
          notes: order.notes || null
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
          updated_at: new Date().toISOString()
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
          courier_id: courierId,
          updated_at: new Date().toISOString()
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
      const dbUpdates: any = {};
      if (updates.customer !== undefined) dbUpdates.customer = updates.customer;
      if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.location !== undefined) dbUpdates.location = updates.location;
      if (updates.courierId !== undefined) dbUpdates.courier_id = updates.courierId;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.total !== undefined) dbUpdates.total = updates.total;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.items !== undefined) dbUpdates.items = updates.items;
      dbUpdates.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('orders')
        .update(dbUpdates)
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
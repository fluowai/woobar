import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { resolveTenantId } from '../lib/tenant';
import type { MenuItem } from '../lib/database.types';

export const CATEGORIES = ['Todos', 'Burgers', 'Porções', 'Bebidas', 'Drinks'];

function mapMenuItemFromDB(item: any): MenuItem {
  return {
    id: item.id,
    tenantId: item.tenant_id || 'default',
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    image: item.image,
    isAvailable: item.is_available,
    createdAt: item.created_at,
    updatedAt: item.updated_at
  };
}

export function useMenu() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchMenu = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      setItems((data || []).map(mapMenuItemFromDB));
    } catch (err) {
      setError(err as Error);
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const getByCategory = useCallback(async (category: string) => {
    if (category === 'Todos') {
      return fetchMenu();
    }

    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('category', category)
        .eq('is_available', true)
        .order('name');

      if (error) throw error;
      return (data || []).map(mapMenuItemFromDB);
    } catch (err) {
      console.error('Error fetching menu by category:', err);
      throw err;
    }
  }, [fetchMenu]);

  const updateItem = useCallback(async (id: number, updates: Partial<MenuItem>) => {
    try {
      const dbUpdates: any = {};
      if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.category !== undefined) dbUpdates.category = updates.category;
      if (updates.image !== undefined) dbUpdates.image = updates.image;

      const { error } = await supabase
        .from('menu_items')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    } catch (err) {
      console.error('Error updating menu item:', err);
      throw err;
    }
  }, []);

  const createItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    try {
      const tenantId = await resolveTenantId();
      const { data, error } = await supabase
        .from('menu_items')
        .insert({
          tenant_id: tenantId,
          name: item.name,
          description: item.description,
          price: item.price,
          category: item.category,
          image: item.image,
          is_available: item.isAvailable
        })
        .select()
        .single();

      if (error) throw error;
      const newItem = mapMenuItemFromDB(data);
      setItems(prev => [...prev, newItem]);
      return newItem;
    } catch (err) {
      console.error('Error creating menu item:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  return {
    items,
    loading,
    error,
    refetch: fetchMenu,
    getByCategory,
    updateItem,
    createItem
  };
}

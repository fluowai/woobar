import { supabase } from './supabase';
import type { SoldItem } from './database.types';

export type { SoldItem };

interface AddItemInput {
  code: string;
  itemName: string;
  itemId?: number;
  price: number;
  type: 'token' | 'ticket';
  status?: 'valid' | 'used';
  tenantId?: string;
  purchaseTime?: string;
}

const salesApi = {
  async getItems() {
    const { data, error } = await supabase
      .from('sold_items')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return data as SoldItem[];
  },

  async addItem(item: AddItemInput) {
    const { data, error } = await supabase
      .from('sold_items')
      .insert({
        code: item.code,
        item_name: item.itemName,
        item_id: item.itemId || null,
        price: item.price,
        status: item.status || 'valid',
        type: item.type,
        purchase_time: item.purchaseTime || new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return {
      id: data.id,
      code: data.code,
      itemName: data.item_name,
      itemId: data.item_id,
      price: data.price,
      purchaseTime: data.purchase_time,
      status: data.status,
      type: data.type
    } as SoldItem;
  },

  async validateCode(code: string) {
    const { data, error } = await supabase
      .from('sold_items')
      .select('*')
      .eq('code', code)
      .single();
    if (error) return null;
    return {
      id: data.id,
      code: data.code,
      itemName: data.item_name,
      itemId: data.item_id,
      price: data.price,
      purchaseTime: data.purchase_time,
      status: data.status,
      type: data.type
    } as SoldItem;
  },

  async markAsUsed(code: string) {
    const { data, error } = await supabase
      .from('sold_items')
      .update({ 
        status: 'used',
        purchase_time: new Date().toISOString()
      })
      .eq('code', code)
      .eq('status', 'valid')
      .select()
      .single();
    if (error) return false;
    return !!data;
  },

  async generateCode(): Promise<string> {
    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const existing = await supabase
      .from('sold_items')
      .select('code')
      .eq('code', code)
      .single();
    if (existing.data) {
      return salesApi.generateCode();
    }
    return code;
  }
};

export const SalesStore = salesApi;

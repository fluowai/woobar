import { supabase } from './supabase';
import type { 
  User, 
  MenuItem, 
  Category, 
  SoldItem, 
  Order, 
  OrderItem, 
  OrderStatus,
  CoverChargeTransaction,
  Table,
  TableStatus,
  Event,
  EventTicket,
  TableOrder
} from './database.types';

export const userApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('name');
    if (error) throw error;
    return data as User[];
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as User;
  },

  async getByRole(role: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('role', role)
      .order('name');
    if (error) throw error;
    return data as User[];
  },

  async create(user: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  },

  async update(id: string, updates: Partial<User>) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  },

  async updateLocation(id: string, location: { lat: number; lng: number }) {
    const { data, error } = await supabase
      .from('users')
      .update({ currentLocation: location })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as User;
  }
};

export const menuApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('is_available', true)
      .order('name');
    if (error) throw error;
    return data as MenuItem[];
  },

  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order');
    if (error) throw error;
    return data as Category[];
  },

  async getByCategory(category: string) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('category', category)
      .eq('is_available', true)
      .order('name');
    if (error) throw error;
    return data as MenuItem[];
  },

  async create(item: Partial<MenuItem>) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert(item)
      .select()
      .single();
    if (error) throw error;
    return data as MenuItem;
  },

  async update(id: number, updates: Partial<MenuItem>) {
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as MenuItem;
  }
};

export const salesApi = {
  async getItems() {
    const { data, error } = await supabase
      .from('sold_items')
      .select('*')
      .order('id', { ascending: false });
    if (error) throw error;
    return data as SoldItem[];
  },

  async addItem(item: Omit<SoldItem, 'id' | 'purchaseTime' | 'status'>) {
    const { data, error } = await supabase
      .from('sold_items')
      .insert({
        ...item,
        status: 'valid',
        purchaseTime: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data as SoldItem;
  },

  async validateCode(code: string) {
    const { data, error } = await supabase
      .from('sold_items')
      .select('*')
      .eq('code', code)
      .single();
    if (error) return null;
    return data as SoldItem;
  },

  async markAsUsed(code: string) {
    const { data, error } = await supabase
      .from('sold_items')
      .update({ 
        status: 'used',
        purchaseTime: new Date().toISOString()
      })
      .eq('code', code)
      .eq('status', 'valid')
      .select()
      .single();
    if (error) return false;
    return !!data;
  },

  async generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
};

export const orderApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  },

  async getByStatus(status: OrderStatus) {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Order[];
  },

  async create(order: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .insert({
        ...order,
        status: 'pending',
        createdAt: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  async updateStatus(id: string, status: OrderStatus) {
    const { data, error } = await supabase
      .from('orders')
      .update({ 
        status,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  async assignCourier(orderId: string, courierId: string) {
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
    return data as Order;
  },

  async update(id: string, updates: Partial<Order>) {
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  }
};

export const coverChargeApi = {
  async getTransactions(limit = 50) {
    const { data, error } = await supabase
      .from('cover_charge_transactions')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data as CoverChargeTransaction[];
  },

  async addTransaction(transaction: Omit<CoverChargeTransaction, 'id' | 'timestamp'>) {
    const { data, error } = await supabase
      .from('cover_charge_transactions')
      .insert({
        ...transaction,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data as CoverChargeTransaction;
  },

  async getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cover_charge_transactions')
      .select('*')
      .eq('type', 'entry')
      .gte('timestamp', today);
    if (error) throw error;
    
    const entries = data as CoverChargeTransaction[];
    return {
      count: entries.length,
      revenue: entries.reduce((acc, t) => acc + t.amount, 0)
    };
  },

  async getCurrentOccupancy() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('cover_charge_transactions')
      .select('type, timestamp')
      .gte('timestamp', today);
    if (error) throw error;
    
    const transactions = data as CoverChargeTransaction[];
    let count = 0;
    transactions.forEach(t => {
      if (t.type === 'entry') count++;
      else if (t.type === 'exit') count--;
    });
    return Math.max(0, count);
  }
};

export const tableApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('tables')
      .select('*')
      .order('id');
    if (error) throw error;
    return data as Table[];
  },

  async updateStatus(id: number, status: TableStatus, orders?: TableOrder) {
    const { data, error } = await supabase
      .from('tables')
      .update({ 
        status,
        orders,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Table;
  },

  async create(table: Partial<Table>) {
    const { data, error } = await supabase
      .from('tables')
      .insert(table)
      .select()
      .single();
    if (error) throw error;
    return data as Table;
  }
};

export const eventApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');
    if (error) throw error;
    return data as Event[];
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as Event;
  },

  async create(event: Partial<Event>) {
    const { data, error } = await supabase
      .from('events')
      .insert(event)
      .select()
      .single();
    if (error) throw error;
    return data as Event;
  },

  async updateTickets(eventId: number, tickets: EventTicket[]) {
    const { data, error } = await supabase
      .from('events')
      .update({ tickets })
      .eq('id', eventId)
      .select()
      .single();
    if (error) throw error;
    return data as Event;
  }
};

export const courierApi = {
  async updatePosition(courierId: string, lat: number, lng: number) {
    const { error } = await supabase
      .from('courier_positions')
      .upsert({
        courierId,
        lat,
        lng,
        timestamp: new Date().toISOString()
      });
    if (error) throw error;
  },

  async getPositions() {
    const { data, error } = await supabase
      .from('courier_positions')
      .select('*');
    if (error) throw error;
    return data;
  }
};

export const chatApi = {
  async getMessages(orderId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('orderId', orderId)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    return data;
  },

  async sendMessage(orderId: string, sender: 'customer' | 'system', message: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        orderId,
        sender,
        message,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
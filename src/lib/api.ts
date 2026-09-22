import { supabase } from './supabase';
import { resolveTenantId } from './tenant';
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
      .update({ current_location: location })
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
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        tenant_id: item.tenantId || tenantId,
        name: item.name ?? '',
        description: item.description ?? null,
        price: item.price ?? 0,
        category: item.category ?? 'Outros',
        image: item.image ?? null,
        is_available: item.isAvailable ?? true
      })
      .select()
      .single();
    if (error) throw error;
    return data as MenuItem;
  },

  async update(id: number, updates: Partial<MenuItem>) {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.category !== undefined) dbUpdates.category = updates.category;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

    const { data, error } = await supabase
      .from('menu_items')
      .update(dbUpdates)
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
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('sold_items')
      .insert({
        tenant_id: tenantId,
        code: item.code,
        item_name: item.itemName,
        item_id: item.itemId ?? null,
        price: item.price,
        status: 'valid',
        type: item.type,
        purchase_time: new Date().toISOString()
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
        used_time: new Date().toISOString()
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
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('orders')
      .insert({
        tenant_id: tenantId,
        customer: order.customer ?? '',
        customer_phone: order.customerPhone ?? null,
        items: order.items ?? [],
        total: order.total ?? 0,
        status: 'pending',
        time: order.time ?? new Date().toISOString(),
        address: order.address ?? null,
        location: order.location ?? null,
        courier_id: order.courierId ?? null,
        payment_method: order.paymentMethod ?? null,
        notes: order.notes ?? null
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
        updated_at: new Date().toISOString()
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
        courier_id: courierId,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();
    if (error) throw error;
    return data as Order;
  },

  async update(id: string, updates: Partial<Order>) {
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
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('cover_charge_transactions')
      .insert({
        tenant_id: tenantId,
        type: transaction.type,
        amount: transaction.amount,
        method: transaction.method,
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
        updated_at: new Date().toISOString()
      })
      .eq('tenant_id', await resolveTenantId())
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as Table;
  },

  async create(table: Partial<Table>) {
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('tables')
      .insert({
        id: table.id ?? undefined,
        tenant_id: table.tenantId || tenantId,
        name: table.name ?? 'Mesa',
        seats: table.seats ?? 4,
        status: table.status ?? 'free'
      })
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
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('events')
      .insert({
        tenant_id: event.tenantId || tenantId,
        title: event.title ?? 'Evento',
        date: event.date ?? new Date().toISOString().split('T')[0],
        time: event.time ?? '20:00',
        location: event.location ?? null,
        image: event.image ?? null,
        tickets: event.tickets ?? []
      })
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
    const tenantId = await resolveTenantId();
    const { error } = await supabase
      .from('courier_positions')
      .upsert({
        courier_id: courierId,
        tenant_id: tenantId,
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
      .eq('order_id', orderId)
      .order('timestamp', { ascending: true });
    if (error) throw error;
    return data;
  },

  async sendMessage(orderId: string, sender: 'customer' | 'system', message: string) {
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        tenant_id: tenantId,
        order_id: orderId,
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
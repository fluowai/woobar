export type UserRole = 'super_admin' | 'tenant_admin' | 'waiter' | 'kitchen' | 'courier' | 'cashier' | 'manager';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'pro' | 'enterprise';
  billingStatus?: 'paid' | 'pending' | 'overdue';
  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentIntegration {
  id: string;
  tenantId: string;
  provider: 'asaas' | 'mercadopago' | 'cielo' | 'rede' | 'pagarme' | 'pagbank';
  apiKey?: string;
  apiSecret?: string;
  pixKey?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface SupportTicket {
  id: string;
  tenantId: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  tenantId?: string; // null for super_admin
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'inactive';
  avatar?: string;
  currentLocation?: { lat: number; lng: number };
  isAvailable?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MenuItem {
  id: number;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  isAvailable: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: number;
  tenantId: string;
  name: string;
  displayOrder: number;
}

export interface SoldItem {
  id?: number;
  tenantId: string;
  code: string;
  itemName: string;
  itemId?: number;
  price: number;
  purchaseTime: string;
  status: 'valid' | 'used';
  type: 'token' | 'ticket';
  orderId?: number;
  createdAt?: string;
}

export interface Order {
  id: string;
  tenantId: string;
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

export interface OrderItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

export interface CoverChargeTransaction {
  id?: number;
  tenantId: string;
  type: 'entry' | 'exit';
  amount: number;
  method: 'pix' | 'credit' | 'debit' | 'cash';
  timestamp: string;
  createdAt?: string;
}

export interface Table {
  id: number;
  tenantId: string;
  name: string;
  seats: number;
  status: TableStatus;
  orders?: TableOrder;
  createdAt?: string;
  updatedAt?: string;
}

export type TableStatus = 'free' | 'occupied' | 'reserved' | 'dirty';

export interface TableOrder {
  items: OrderItem[];
  total: number;
  time: string;
}

export interface Event {
  id: number;
  tenantId: string;
  title: string;
  date: string;
  time: string;
  location: string;
  image: string;
  tickets: EventTicket[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventTicket {
  id: string;
  name: string;
  price: number;
  available: number;
}

export interface BarToken {
  id?: number;
  tenantId: string;
  code: string;
  itemName: string;
  price: number;
  status: 'valid' | 'used';
  purchaseTime: string;
  usedTime?: string;
  createdAt?: string;
}

export interface CourierPosition {
  courierId: string;
  tenantId: string;
  lat: number;
  lng: number;
  timestamp: string;
}

export interface ChatMessage {
  id?: number;
  tenantId: string;
  orderId: string;
  sender: 'customer' | 'system';
  message: string;
  timestamp: string;
}

export const CATEGORIES = ['Todos', 'Burgers', 'Porções', 'Bebidas', 'Drinks'];
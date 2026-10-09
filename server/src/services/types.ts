export type ChannelType = 'ifood' | 'uber' | 'rappi' | 'food99' | 'whatsapp' | 'website' | 'facebook' | 'instagram';

export interface NormalizedOrderItem {
  product_id?: string;
  external_id?: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface NormalizedCustomer {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface NormalizedOrder {
  external_id: string;
  channel: ChannelType;
  customer: NormalizedCustomer;
  items: NormalizedOrderItem[];
  total: number;
  payment_method?: string;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  notes?: string;
  raw: any;
}

export interface ChannelConfig {
  id: string;
  establishment_id: string;
  name: string;
  type: ChannelType;
  api_key?: string;
  webhook_url?: string;
  webhook_secret?: string;
  active: number;
  config_json: Record<string, any>;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivering' | 'delivered' | 'cancelled';

export const STATUS_MAP: Record<string, Record<string, string>> = {
  ifood: {
    PLACED: 'pending',
    CONFIRMED: 'preparing',
    READY: 'ready',
    GOING: 'delivering',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
    AWAITING_PAYMENT: 'pending',
  },
  uber: {
    new: 'pending',
    preparing: 'preparing',
    ready: 'ready',
    picked_up: 'delivering',
    delivered: 'delivered',
    cancelled: 'cancelled',
    'orders.notification': 'pending',
    'orders.cancel': 'cancelled',
  },
  rappi: {
    SENT: 'pending',
    PENDING: 'pending',
    ACCEPTED: 'preparing',
    IN_KITCHEN: 'preparing',
    PREPARING: 'preparing',
    READY_FOR_PICKUP: 'ready',
    READY: 'ready',
    ON_THE_WAY: 'delivering',
    DELIVERING: 'delivering',
    DELIVERED: 'delivered',
    COMPLETED: 'delivered',
    CANCELLED: 'cancelled',
    REJECTED: 'cancelled',
  },
  food99: {
    NEW: 'pending',
    PLACED: 'pending',
    CONFIRMED: 'preparing',
    ACCEPTED: 'preparing',
    PREPARING: 'preparing',
    READY: 'ready',
    DISPATCHED: 'delivering',
    OUT_FOR_DELIVERY: 'delivering',
    DELIVERED: 'delivered',
    CANCELLED: 'cancelled',
  },
};

export const REVERSE_STATUS_MAP: Record<string, Record<string, string>> = {
  ifood: {
    pending: 'PLACED',
    preparing: 'CONFIRMED',
    ready: 'READY',
    delivering: 'GOING',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
  },
  uber: {
    pending: 'new',
    preparing: 'preparing',
    ready: 'ready',
    delivering: 'picked_up',
    delivered: 'delivered',
    cancelled: 'cancelled',
  },
  rappi: {
    pending: 'SENT',
    preparing: 'ACCEPTED',
    ready: 'READY_FOR_PICKUP',
    delivering: 'ON_THE_WAY',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
  },
  food99: {
    pending: 'CONFIRMED',
    preparing: 'CONFIRMED',
    ready: 'READY',
    delivering: 'DISPATCHED',
    delivered: 'DELIVERED',
    cancelled: 'CANCELLED',
  },
};

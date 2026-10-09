export interface Food99OrderItem {
  id?: string;
  sku?: string;
  name?: string;
  description?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  total?: number;
  observations?: string;
}

export interface Food99Customer {
  name?: string;
  customer_name?: string;
  phone?: string;
  mobile?: string;
  email?: string;
}

export interface Food99Address {
  street?: string;
  address?: string;
  number?: string;
  complement?: string;
  district?: string;
  neighborhood?: string;
  city?: string;
  zip_code?: string;
  latitude?: number;
  longitude?: number;
}

export interface Food99Order {
  order_id?: string;
  id?: string;
  external_id?: string;
  status?: string;
  order_status?: string;
  payment_method?: string;
  total?: number;
  total_amount?: number;
  grand_total?: number;
  items?: Food99OrderItem[];
  products?: Food99OrderItem[];
  customer?: Food99Customer;
  customer_name?: string;
  customer_phone?: string;
  delivery_address?: Food99Address;
  address?: Food99Address;
  notes?: string;
}

export interface Food99WebhookPayload {
  event?: string;
  action?: string;
  type?: string;
  data?: Food99Order;
  order?: Food99Order;
}

export interface Food99TokenResponse {
  access_token?: string;
  token?: string;
  expires_in?: number;
}

export interface RappiOrderItem {
  id?: string;
  sku?: string;
  name?: string;
  product_name?: string;
  quantity?: number;
  price?: number;
  unit_price?: number;
  total?: number;
  note?: string;
  notes?: string;
}

export interface RappiCustomer {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  cell_phone?: string;
  email?: string;
}

export interface RappiDeliveryInformation {
  complete_address?: string;
  street_name?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  postal_code?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface RappiOrderDetail {
  order_id?: string;
  id?: string;
  status?: string;
  cooking_time?: number;
  payment_method?: string;
  delivery_method?: string;
  total?: number;
  sub_total?: number;
  subtotal?: number;
  items_total?: number;
  delivery_information?: RappiDeliveryInformation;
  customer?: RappiCustomer;
  store?: { internal_id?: string; external_id?: string; name?: string };
  items?: RappiOrderItem[];
  products?: RappiOrderItem[];
  order_items?: RappiOrderItem[];
}

export interface RappiOrdersResponse {
  order_detail?: RappiOrderDetail[];
  orders?: RappiOrderDetail[];
  data?: RappiOrderDetail[];
}

export interface RappiEvent {
  id?: string;
  order_id?: string;
  status?: string;
  event?: string;
  type?: string;
  created_at?: string;
}

export interface RappiTokenResponse {
  access_token?: string;
  token?: string;
  expires_in?: number;
}

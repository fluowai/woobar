export interface UberTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface UberWebhookPayload {
  event_type: string;
  event_id: string;
  resource_id: string;
  resource_type: string;
  merchant_uuid: string;
  occurred_at: string;
}

export interface UberCustomer {
  name: string;
  phone?: string;
}

export interface UberDeliveryAddress {
  street_address: string;
  street_address2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  notes?: string;
  latitude?: number;
  longitude?: number;
}

export interface UberOrderItem {
  id: string;
  title: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions?: string;
}

export interface UberOrder {
  id: string;
  merchant_uuid: string;
  customer: UberCustomer;
  delivery_address?: UberDeliveryAddress;
  items: UberOrderItem[];
  total: number;
  status: string;
  currency: string;
  created_at: string;
  payment_type?: string;
}

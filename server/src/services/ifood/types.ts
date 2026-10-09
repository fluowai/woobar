export interface IfoodTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface IfoodEvent {
  id: string;
  code: string;
  correlationId: string;
  merchantId: string;
  orderId: string;
  createdAt: string;
}

export interface IfoodCustomer {
  name: string;
  phone?: string;
  documentNumber?: string;
}

export interface IfoodDeliveryAddress {
  streetName: string;
  streetNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  reference?: string;
  complement?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface IfoodOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: IfoodOrderItemOption[];
  notes?: string;
}

export interface IfoodOrderItemOption {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface IfoodPayment {
  type: string;
  method: string;
  prepaid: boolean;
  change: number;
}

export interface IfoodOrder {
  id: string;
  merchantId: string;
  customer: IfoodCustomer;
  deliveryAddress?: IfoodDeliveryAddress;
  items: IfoodOrderItem[];
  total: number;
  payments?: IfoodPayment[];
  status: string;
  createdAt: string;
  preparationStartDateTime?: string;
  orderTiming?: string;
}

export interface IfoodMerchant {
  id: string;
  name: string;
  corporateName: string;
}

export interface IfoodMenuItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  status: string;
  externalCode?: string;
}

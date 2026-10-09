import { NormalizedOrder } from '../types.js';
import { RappiCustomer, RappiOrderDetail } from './types.js';

function pickItemName(item: any): string {
  return item.name || item.product_name || item.title || 'Item';
}

function pickItemQuantity(item: any): number {
  return Number(item.quantity || item.qty || 1);
}

function pickItemPrice(item: any): number {
  const price = item.price ?? item.unit_price ?? item.unitPrice ?? 0;
  return Number(price) || 0;
}

export function mapRappiOrderToNormalized(rappiOrder: RappiOrderDetail): NormalizedOrder {
  const rawItems = rappiOrder.items || rappiOrder.products || rappiOrder.order_items || [];
  const items = rawItems.map((item: any) => ({
    external_id: item.id || item.sku,
    name: pickItemName(item),
    quantity: pickItemQuantity(item),
    price: pickItemPrice(item),
    notes: item.notes || item.note,
  }));

  const address = rappiOrder.delivery_information;
  const fullAddress = address
    ? [
        address.street_name,
        address.street_number,
        address.complement,
        address.neighborhood,
        address.city,
        address.postal_code,
      ]
        .filter(Boolean)
        .join(', ') || address.complete_address
    : undefined;

  const customer: RappiCustomer = rappiOrder.customer || {};
  const customerName =
    customer.name || [customer.first_name, customer.last_name].filter(Boolean).join(' ') || 'Cliente Rappi';

  const total =
    Number(rappiOrder.total ?? rappiOrder.items_total ?? rappiOrder.sub_total ?? rappiOrder.subtotal) ||
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    external_id: String(rappiOrder.order_id || rappiOrder.id || ''),
    channel: 'rappi',
    customer: {
      name: customerName,
      phone: customer.phone || customer.cell_phone,
      email: customer.email,
    },
    items,
    total,
    payment_method: rappiOrder.payment_method || 'rappi',
    delivery_address: fullAddress,
    delivery_lat: address?.latitude,
    delivery_lng: address?.longitude,
    raw: rappiOrder,
  };
}

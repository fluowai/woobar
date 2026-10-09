import { NormalizedOrder } from '../types.js';
import { Food99Order } from './types.js';

function buildAddress(order: Food99Order): string | undefined {
  const address = order.delivery_address || order.address;
  if (!address) return undefined;

  const parts = [
    address.street || address.address,
    address.number,
    address.complement,
    address.district || address.neighborhood,
    address.city,
    address.zip_code,
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : address.street || address.address;
}

export function mapFood99OrderToNormalized(food99Order: Food99Order): NormalizedOrder {
  const rawItems = food99Order.items || food99Order.products || [];
  const items = rawItems.map((item: any) => ({
    external_id: item.id || item.sku,
    name: item.name || item.description || 'Item',
    quantity: Number(item.quantity || 1),
    price: Number(item.price ?? item.unit_price ?? 0) || 0,
    notes: item.observations,
  }));

  const address = food99Order.delivery_address || food99Order.address;
  const total =
    Number(food99Order.total ?? food99Order.total_amount ?? food99Order.grand_total) ||
    items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return {
    external_id: String(food99Order.order_id || food99Order.id || food99Order.external_id || ''),
    channel: 'food99',
    customer: {
      name: food99Order.customer?.name || food99Order.customer_name || 'Cliente 99Food',
      phone: food99Order.customer?.phone || food99Order.customer?.mobile || food99Order.customer_phone,
      email: food99Order.customer?.email,
    },
    items,
    total,
    payment_method: food99Order.payment_method || '99food',
    delivery_address: buildAddress(food99Order),
    delivery_lat: address?.latitude,
    delivery_lng: address?.longitude,
    notes: food99Order.notes,
    raw: food99Order,
  };
}

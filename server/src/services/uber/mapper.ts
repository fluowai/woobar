import { NormalizedOrder } from '../types.js';
import { UberOrder } from './types.js';

export function mapUberOrderToNormalized(uberOrder: UberOrder): NormalizedOrder {
  const items = uberOrder.items.map(item => ({
    external_id: item.id,
    name: item.title,
    quantity: item.quantity,
    price: item.total_price,
    notes: item.special_instructions,
  }));

  const address = uberOrder.delivery_address;
  const fullAddress = address
    ? `${address.street_address}${address.street_address2 ? `, ${address.street_address2}` : ''} - ${address.city}, ${address.state}`
    : undefined;

  return {
    external_id: uberOrder.id,
    channel: 'uber',
    customer: {
      name: uberOrder.customer.name,
      phone: uberOrder.customer.phone,
    },
    items,
    total: uberOrder.total,
    payment_method: uberOrder.payment_type || 'uber',
    delivery_address: fullAddress,
    delivery_lat: address?.latitude,
    delivery_lng: address?.longitude,
    raw: uberOrder,
  };
}

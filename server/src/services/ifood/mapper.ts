import { NormalizedOrder } from '../types.js';
import { IfoodOrder } from './types.js';

export function mapIfoodOrderToNormalized(ifoodOrder: IfoodOrder): NormalizedOrder {
  const items = ifoodOrder.items.map(item => ({
    external_id: item.id,
    name: item.name,
    quantity: item.quantity,
    price: item.totalPrice,
    notes: item.notes,
  }));

  const address = ifoodOrder.deliveryAddress;
  const fullAddress = address
    ? `${address.streetName}, ${address.streetNumber}${address.complement ? ` - ${address.complement}` : ''} - ${address.neighborhood}, ${address.city} - ${address.state}`
    : undefined;

  return {
    external_id: ifoodOrder.id,
    channel: 'ifood',
    customer: {
      name: ifoodOrder.customer.name,
      phone: ifoodOrder.customer.phone,
    },
    items,
    total: ifoodOrder.total,
    payment_method: ifoodOrder.payments?.[0]?.method || 'ifood',
    delivery_address: fullAddress,
    delivery_lat: address?.coordinates?.latitude,
    delivery_lng: address?.coordinates?.longitude,
    notes: ifoodOrder.orderTiming === 'SCHEDULED' ? 'Pedido agendado' : undefined,
    raw: ifoodOrder,
  };
}

import { getOrder } from './client.js';
import { mapUberOrderToNormalized } from './mapper.js';
import { STATUS_MAP } from '../types.js';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';
import { UberWebhookPayload } from './types.js';

const NEW_ORDER_EVENTS = ['orders.notification', 'orders.scheduled.notification', 'order.new', 'order.updated'];
const CANCEL_EVENTS = ['orders.cancel', 'orders.failure', 'order.cancelled'];

export async function handleUberWebhook(channelId: string, payload: UberWebhookPayload): Promise<void> {
  const eventType = String(payload.event_type || '');
  const orderId = String(payload.resource_id || (payload as any).order_id || '');

  logger.info('Uber webhook received', { eventType, orderId });

  if (!orderId) return;

  if (CANCEL_EVENTS.includes(eventType)) {
    const existing = db
      .prepare('SELECT id, establishment_id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
      .get(channelId, orderId) as any;
    if (existing) {
      db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run('cancelled', existing.id);
      db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?')
        .run('cancelled', orderId, 'uber', existing.establishment_id);
    }
    return;
  }

  if (!NEW_ORDER_EVENTS.includes(eventType)) return;

  const existing = db
    .prepare('SELECT id, status, establishment_id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channelId, orderId) as any;

  const orderData = await getOrder(channelId, orderId);
  if (!orderData) {
    logger.error('Failed to fetch Uber order', { orderId });
    return;
  }

  if (!existing) {
    const normalized = mapUberOrderToNormalized(orderData);
    await processNormalizedOrder(channelId, normalized);
    return;
  }

  const woStatus = STATUS_MAP.uber[String(orderData.status || '').toLowerCase()];
  if (woStatus && woStatus !== existing.status) {
    db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run(woStatus, existing.id);
    db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?')
      .run(woStatus, orderId, 'uber', existing.establishment_id);
  }
}

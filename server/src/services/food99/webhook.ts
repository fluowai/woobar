import { v4 as uuid } from 'uuid';
import { getOrder } from './client.js';
import { mapFood99OrderToNormalized } from './mapper.js';
import { STATUS_MAP } from '../types.js';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';
import { Food99Order, Food99WebhookPayload } from './types.js';

export async function handleFood99Webhook(channelId: string, payload: Food99WebhookPayload): Promise<void> {
  const order = payload.order || payload.data || (payload as unknown as Food99Order);
  const externalId = String(order.order_id || order.id || order.external_id || '');
  const event = String(payload.event || payload.action || payload.type || '').toLowerCase();

  if (!externalId) {
    logger.warn('99Food webhook without order id', { channelId, event });
    return;
  }

  const existing = db
    .prepare('SELECT id, status, establishment_id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channelId, externalId) as any;

  if (!existing) {
    let orderData = order;
    if (!order.items && !order.products) {
      const fetched = await getOrder(channelId, externalId);
      if (fetched) orderData = fetched;
    }

    const normalized = mapFood99OrderToNormalized(orderData);
    if (!normalized.external_id || !normalized.items.length) {
      logger.error('99Food webhook order could not be normalized', { channelId, externalId });
      return;
    }

    await processNormalizedOrder(channelId, normalized);
    logEvent(channelId, 'order_received', externalId, { event, total: normalized.total });
    return;
  }

  const platformStatus = String(order.status || order.order_status || event).toUpperCase();
  const woStatus = STATUS_MAP.food99[platformStatus];
  if (!woStatus || woStatus === existing.status) return;

  db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run(woStatus, existing.id);
  db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?').run(
    woStatus,
    externalId,
    'food99',
    existing.establishment_id
  );

  logEvent(channelId, 'status_change', externalId, { platformStatus, woStatus });
}

function logEvent(channelId: string, eventType: string, eventExternalId: string, details: any) {
  try {
    db.prepare(
      'INSERT INTO channel_event_log (id, channel_id, event_type, event_external_id, details_json, processed) VALUES (?,?,?,?,?,1)'
    ).run(uuid(), channelId, eventType, eventExternalId, JSON.stringify(details));
  } catch {}
}

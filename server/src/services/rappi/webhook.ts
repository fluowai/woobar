import { v4 as uuid } from 'uuid';
import { mapRappiOrderToNormalized } from './mapper.js';
import { STATUS_MAP } from '../types.js';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';
import { RappiOrderDetail } from './types.js';

interface RappiWebhookPayload {
  event?: string;
  type?: string;
  data?: RappiOrderDetail;
  order?: RappiOrderDetail;
}

export async function handleRappiWebhook(channelId: string, payload: RappiWebhookPayload): Promise<void> {
  const order = payload.order || payload.data || (payload as unknown as RappiOrderDetail);
  const externalId = String(order.order_id || order.id || '');
  const event = String(payload.event || payload.type || '').toLowerCase();

  if (!externalId) {
    logger.warn('Rappi webhook without order id', { channelId, event });
    return;
  }

  const existing = db
    .prepare('SELECT id, status, establishment_id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channelId, externalId) as any;

  if (!existing) {
    const normalized = mapRappiOrderToNormalized(order);
    if (!normalized.external_id || !normalized.items.length) {
      logger.error('Rappi webhook order could not be normalized', { channelId, externalId });
      return;
    }
    await processNormalizedOrder(channelId, normalized);
    logEvent(channelId, 'order_received', externalId, { event, total: normalized.total });
    return;
  }

  const platformStatus = String(order.status || event).toUpperCase();
  const woStatus = STATUS_MAP.rappi[platformStatus];
  if (!woStatus || woStatus === existing.status) return;

  db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run(woStatus, existing.id);
  db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?').run(
    woStatus,
    externalId,
    'rappi',
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

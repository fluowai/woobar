import { v4 as uuid } from 'uuid';
import { pollEvents, acknowledgeEvents, getOrder } from './client.js';
import { mapIfoodOrderToNormalized } from './mapper.js';
import { STATUS_MAP } from '../types.js';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';
import { IfoodEvent } from './types.js';

const POLL_INTERVAL_MS = 15000;
const activePollers = new Map<string, NodeJS.Timeout>();

const EVENT_CODE_MAP: Record<string, string> = {
  PLC: 'PLACED',
  PLACED: 'PLACED',
  CON: 'CONFIRMED',
  CONFIRMED: 'CONFIRMED',
  SEPARATION_STARTED: 'CONFIRMED',
  PREPARATION_STARTED: 'CONFIRMED',
  RDY: 'READY',
  READY: 'READY',
  READY_TO_PICKUP: 'READY',
  SEPARATION_ENDED: 'READY',
  GNG: 'GOING',
  GOING: 'GOING',
  DISPATCHED: 'GOING',
  DEL: 'DELIVERED',
  DELIVERED: 'DELIVERED',
  CONCLUDED: 'DELIVERED',
  CAN: 'CANCELLED',
  CANCELLED: 'CANCELLED',
  CANCELLATION_REQUESTED: 'CANCELLED',
  PAY: 'AWAITING_PAYMENT',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
};

export function startPolling(channelId: string) {
  if (activePollers.has(channelId)) return;
  logger.info('Starting iFood polling', { channelId });

  const poll = async () => {
    try {
      const events = await pollEvents(channelId);
      if (!events || events.length === 0) return;

      logger.info('iFood events received', { channelId, count: events.length });

      const processedIds: string[] = [];
      for (const event of events) {
        const handled = await handleIfoodEvent(channelId, event);
        if (handled) processedIds.push(event.id);
      }

      if (processedIds.length) {
        await acknowledgeEvents(channelId, processedIds);
      }
    } catch (err: any) {
      logger.error('iFood polling error', { channelId, error: err.message });
    }
  };

  const interval = setInterval(poll, POLL_INTERVAL_MS);
  activePollers.set(channelId, interval);
  poll();
}

export function stopPolling(channelId: string) {
  const interval = activePollers.get(channelId);
  if (interval) {
    clearInterval(interval);
    activePollers.delete(channelId);
    logger.info('Stopped iFood polling', { channelId });
  }
}

export function stopAllPolling() {
  for (const [channelId] of activePollers) {
    stopPolling(channelId);
  }
}

export async function handleIfoodEvent(channelId: string, event: IfoodEvent): Promise<boolean> {
  const iFoodStatus = EVENT_CODE_MAP[event.code];
  if (!iFoodStatus) {
    logger.debug('Unknown iFood event code', { code: event.code });
    return true;
  }

  const existing = db
    .prepare('SELECT id, external_id, status, establishment_id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channelId, event.orderId) as any;

  if (!existing) {
    const orderData = await getOrder(channelId, event.orderId);
    if (!orderData) {
      logger.error('Failed to fetch iFood order', { orderId: event.orderId });
      return false;
    }
    const normalized = mapIfoodOrderToNormalized(orderData);
    await processNormalizedOrder(channelId, normalized);
    logEvent(channelId, 'order_received', event.id, { iFoodStatus, orderId: event.orderId });
    return true;
  }

  const woStatus = STATUS_MAP.ifood[iFoodStatus];
  if (woStatus && woStatus !== existing.status) {
    db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run(woStatus, existing.id);
    db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?').run(
      woStatus,
      existing.external_id,
      'ifood',
      existing.establishment_id
    );
    logEvent(channelId, 'status_change', event.id, { iFoodStatus, woStatus, orderId: event.orderId });
  }

  return true;
}

function logEvent(channelId: string, eventType: string, eventExternalId: string, details: any) {
  try {
    db.prepare(
      'INSERT INTO channel_event_log (id, channel_id, event_type, event_external_id, details_json, processed) VALUES (?,?,?,?,?,1)'
    ).run(uuid(), channelId, eventType, eventExternalId, JSON.stringify(details));
  } catch {}
}

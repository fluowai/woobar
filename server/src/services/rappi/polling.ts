import { v4 as uuid } from 'uuid';
import { getNewOrders, getEvents, takeOrder } from './client.js';
import { mapRappiOrderToNormalized } from './mapper.js';
import { STATUS_MAP } from '../types.js';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';

const POLL_INTERVAL_MS = 20000;
const OPEN_ORDERS_LIMIT = 10;
const activePollers = new Map<string, NodeJS.Timeout>();

export function startPolling(channelId: string) {
  if (activePollers.has(channelId)) return;
  logger.info('Starting Rappi polling', { channelId });

  const poll = async () => {
    try {
      const orders = await getNewOrders(channelId);
      for (const order of orders) {
        await handleNewOrder(channelId, order);
      }
      await refreshOpenOrders(channelId);
    } catch (err: any) {
      logger.error('Rappi polling error', { channelId, error: err.message });
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
    logger.info('Stopped Rappi polling', { channelId });
  }
}

export function stopAllPolling() {
  for (const [channelId] of activePollers) {
    stopPolling(channelId);
  }
}

async function handleNewOrder(channelId: string, order: any) {
  const externalId = String(order.order_id || order.id || '');
  if (!externalId) return;

  const existing = db
    .prepare('SELECT id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channelId, externalId) as any;
  if (existing) return;

  const normalized = mapRappiOrderToNormalized(order);
  if (!normalized.external_id) return;

  await processNormalizedOrder(channelId, normalized);

  if (isAutoAcceptEnabled(channelId)) {
    const cookingTime = Number(order.cooking_time) || 15;
    await takeOrder(channelId, externalId, cookingTime).catch(() => false);
  }

  logEvent(channelId, 'order_received', externalId, { channel: 'rappi', total: normalized.total });
}

function isAutoAcceptEnabled(channelId: string): boolean {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return false;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json || '{}') : channel.config_json || {};
  return config.auto_accept === true;
}

async function refreshOpenOrders(channelId: string) {
  const openOrders = db
    .prepare(
      `SELECT id, external_id, status, establishment_id FROM channel_orders
       WHERE channel_id = ? AND status NOT IN ('delivered', 'cancelled')
       ORDER BY created_at DESC LIMIT ?`
    )
    .all(channelId, OPEN_ORDERS_LIMIT) as any[];

  for (const order of openOrders) {
    const events = await getEvents(channelId, order.external_id);
    if (!events.length) continue;

    const latest = events[events.length - 1];
    const platformStatus = String(latest.status || latest.event || latest.type || '').toUpperCase();
    const woStatus = STATUS_MAP.rappi[platformStatus];
    if (!woStatus || woStatus === order.status) continue;

    db.prepare('UPDATE channel_orders SET status = ? WHERE id = ?').run(woStatus, order.id);
    db.prepare('UPDATE orders SET status = ? WHERE external_id = ? AND channel = ? AND establishment_id = ?').run(
      woStatus,
      order.external_id,
      'rappi',
      order.establishment_id
    );

    logEvent(channelId, 'status_change', order.external_id, { platformStatus, woStatus });
  }
}

function logEvent(channelId: string, eventType: string, eventExternalId: string, details: any) {
  try {
    db.prepare(
      'INSERT INTO channel_event_log (id, channel_id, event_type, event_external_id, details_json, processed) VALUES (?,?,?,?,?,1)'
    ).run(uuid(), channelId, eventType, eventExternalId, JSON.stringify(details));
  } catch {}
}

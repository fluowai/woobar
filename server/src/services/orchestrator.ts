import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { logger } from '../lib/logger.js';
import { NormalizedOrder, STATUS_MAP } from './types.js';
import { startPolling as startIfoodPolling, stopPolling as stopIfoodPolling } from './ifood/polling.js';
import { startPolling as startRappiPolling, stopPolling as stopRappiPolling } from './rappi/polling.js';

export async function processNormalizedOrder(
  channelId: string,
  order: NormalizedOrder
): Promise<string> {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) {
    logger.error('Channel not found', { channelId });
    throw new Error('Channel not found');
  }

  const existing = db.prepare(
    'SELECT id FROM channel_orders WHERE channel_id = ? AND external_id = ?'
  ).get(channelId, order.external_id) as any;

  if (existing) {
    logger.info('Duplicate order, skipping', { external_id: order.external_id });
    return existing.id;
  }

  const channelOrderId = uuid();
  const orderId = uuid();
  const itemsJson = JSON.stringify(order.items);
  const itemsText = order.items.map(i => `${i.quantity}x ${i.name} (R$ ${(i.price * i.quantity).toFixed(2)})`).join('\n');

  const createOrder = db.transaction(() => {
    db.prepare(`INSERT INTO channel_orders (id, channel_id, establishment_id, external_id, order_json, status) VALUES (?,?,?,?,?,?)`)
      .run(channelOrderId, channelId, channel.establishment_id, order.external_id, JSON.stringify(order.raw), 'received');

    db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, customer_phone, customer_address, items_json, total, status, payment_method, channel, external_id, location_lat, location_lng) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(
        orderId,
        channel.establishment_id,
        order.customer.name,
        order.customer.phone || null,
        order.delivery_address || null,
        itemsJson,
        order.total,
        'pending',
        order.payment_method || null,
        order.channel,
        order.external_id,
        order.delivery_lat || null,
        order.delivery_lng || null
      );

    logAudit(channel.establishment_id, 'channel_order_received', order.channel, orderId, {
      channel: order.channel,
      external_id: order.external_id,
      total: order.total,
    });
  });

  createOrder();

  broadcastUpdate(
    { type: 'new_channel_order', data: { channelOrderId, orderId, channel: order.channel, customer: order.customer, total: order.total } },
    channel.establishment_id
  );

  logger.info('Order processed from channel', {
    channel: order.channel,
    external_id: order.external_id,
    orderId,
  });

  return channelOrderId;
}

export function initializeChannelServices() {
  const channels = db.prepare('SELECT * FROM channels WHERE active = 1').all() as any[];
  logger.info('Initializing channel services', { count: channels.length });

  for (const ch of channels) {
    startChannelService(ch.id, ch.type);
  }
}

export function onChannelToggle(channelId: string, active: boolean) {
  const channel = db.prepare('SELECT type FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return;

  if (active) {
    startChannelService(channelId, channel.type);
  } else {
    stopChannelService(channelId, channel.type);
  }
}

function startChannelService(channelId: string, type: string) {
  if (type === 'ifood') startIfoodPolling(channelId);
  if (type === 'rappi') startRappiPolling(channelId);
}

function stopChannelService(channelId: string, type: string) {
  if (type === 'ifood') stopIfoodPolling(channelId);
  if (type === 'rappi') stopRappiPolling(channelId);
}

export function stopAllChannelServices() {
  const channels = db.prepare('SELECT id, type FROM channels WHERE active = 1').all() as any[];
  for (const ch of channels) stopChannelService(ch.id, ch.type);
  logger.info('Channel services stopped', { count: channels.length });
}

function logAudit(establishmentId: string, action: string, entity: string, entityId: string, details?: any) {
  try {
    // user_id é FK para users — eventos de canal ficam com user_id NULL e o
    // tenant vai no payload de details
    db.prepare('INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details_json) VALUES (?,?,?,?,?,?)')
      .run(uuid(), null, action, entity, entityId, JSON.stringify({ ...(details || {}), establishment_id: establishmentId }));
  } catch (err: any) {
    logger.warn('audit_log write failed', { error: err.message });
  }
}

function broadcastUpdate(data: any, establishmentId?: string) {
  try {
    const wss = (globalThis as any).broadcastWS;
    if (wss) wss(data, establishmentId);
  } catch {}
}

export function getChannelStatus(channelId: string): { polling: boolean } {
  return {
    polling: false,
  };
}

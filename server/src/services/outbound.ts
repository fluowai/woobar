import db from '../db/schema.js';
import { logger } from '../lib/logger.js';
import { OrderStatus, REVERSE_STATUS_MAP } from './types.js';
import {
  confirmOrder,
  startPreparation,
  readyToPickup,
  dispatchOrder,
  getCancellationReasons,
  requestCancellation,
} from './ifood/client.js';
import { takeOrder, rejectOrder, readyForPickup } from './rappi/client.js';
import { updateOrderStatus as updateFood99Status } from './food99/client.js';
import { acceptOrder as acceptUberOrder, denyOrder as denyUberOrder } from './uber/client.js';

interface ChannelBinding {
  channel_id: string;
  type: string;
}

function findChannelBinding(establishmentId: string, externalId: string): ChannelBinding | null {
  const row = db
    .prepare(
      `SELECT c.id AS channel_id, c.type
       FROM channel_orders co
       JOIN channels c ON c.id = co.channel_id
       WHERE co.establishment_id = ? AND co.external_id = ? AND c.active = 1
       LIMIT 1`
    )
    .get(establishmentId, externalId) as ChannelBinding | undefined;
  return row || null;
}

function getChannelConfig(channelId: string): Record<string, any> {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return {};
  return typeof channel.config_json === 'string' ? JSON.parse(channel.config_json || '{}') : channel.config_json || {};
}

export async function syncOrderStatusToChannel(orderId: string, newStatus: OrderStatus): Promise<boolean> {
  const order = db
    .prepare('SELECT id, establishment_id, external_id, channel, status FROM orders WHERE id = ?')
    .get(orderId) as any;
  if (!order?.external_id) return true;

  const binding = findChannelBinding(order.establishment_id, order.external_id);
  if (!binding) return true;

  try {
    const ok = await dispatchStatus(binding, order.external_id, newStatus);
    if (ok) {
      db.prepare('UPDATE channel_orders SET status = ? WHERE channel_id = ? AND external_id = ?').run(
        newStatus === 'pending' ? 'received' : newStatus,
        binding.channel_id,
        order.external_id
      );
    }
    return ok;
  } catch (err: any) {
    logger.error('Failed to sync order status to channel', {
      orderId,
      channel: binding.type,
      status: newStatus,
      error: err.message,
    });
    return false;
  }
}

async function dispatchStatus(
  binding: ChannelBinding,
  externalId: string,
  newStatus: OrderStatus
): Promise<boolean> {
  const config = getChannelConfig(binding.channel_id);

  switch (binding.type) {
    case 'ifood':
      return syncIfood(binding.channel_id, externalId, newStatus);
    case 'rappi':
      return syncRappi(binding.channel_id, externalId, newStatus, config);
    case 'uber':
      return syncUber(binding.channel_id, externalId, newStatus, config);
    case 'food99': {
      const platformStatus = REVERSE_STATUS_MAP.food99[newStatus];
      if (!platformStatus) return true;
      return updateFood99Status(binding.channel_id, externalId, platformStatus);
    }
    default:
      return true;
  }
}

async function syncIfood(channelId: string, externalId: string, newStatus: OrderStatus): Promise<boolean> {
  switch (newStatus) {
    case 'preparing':
      return (await confirmOrder(channelId, externalId)) && (await startPreparation(channelId, externalId));
    case 'ready':
      return readyToPickup(channelId, externalId);
    case 'delivering':
      return dispatchOrder(channelId, externalId);
    case 'cancelled': {
      const reasons = await getCancellationReasons(channelId, externalId);
      const reasonId = reasons[0]?.id;
      if (!reasonId) {
        logger.warn('iFood cancellation reason not available', { externalId });
        return false;
      }
      return requestCancellation(channelId, externalId, reasonId);
    }
    default:
      return true;
  }
}

async function syncRappi(
  channelId: string,
  externalId: string,
  newStatus: OrderStatus,
  config: Record<string, any>
): Promise<boolean> {
  switch (newStatus) {
    case 'preparing':
      return takeOrder(channelId, externalId, Number(config.cooking_time) || 15);
    case 'ready':
      return readyForPickup(channelId, externalId);
    case 'cancelled':
      return rejectOrder(channelId, externalId, config.cancel_reason || 'ORDER_MISSING_INFORMATION');
    default:
      return true;
  }
}

async function syncUber(
  channelId: string,
  externalId: string,
  newStatus: OrderStatus,
  config: Record<string, any>
): Promise<boolean> {
  switch (newStatus) {
    case 'preparing':
      return acceptUberOrder(channelId, externalId, config.store_id);
    case 'cancelled':
      return denyUberOrder(channelId, externalId, config.store_id, config.cancel_reason || 'merchant_unable_to_fulfill');
    default:
      return true;
  }
}

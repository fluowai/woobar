import { getAccessToken, clearToken } from './auth.js';
import { Food99Order } from './types.js';
import { logger } from '../../lib/logger.js';
import db from '../../db/schema.js';

interface Food99ApiConfig {
  api_url: string;
  status_path: string;
  order_path: string;
}

function getApiConfig(channelId: string): Food99ApiConfig | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  if (!config?.api_url) return null;
  return {
    api_url: String(config.api_url).replace(/\/$/, ''),
    status_path: config.status_path || '/orders/{orderId}/status',
    order_path: config.order_path || '/orders/{orderId}',
  };
}

async function apiFetch<T>(
  channelId: string,
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const config = getApiConfig(channelId);
  if (!config) {
    logger.error('99Food API url not configured for channel', { channelId });
    return null;
  }

  const token = await getAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(`${config.api_url}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      clearToken(channelId);
      return null;
    }
    if (res.status === 204) return null as T;
    if (!res.ok) {
      logger.error('99Food API error', { path, status: res.status });
      return null;
    }
    return res.json();
  } catch (err: any) {
    logger.error('99Food API fetch error', { path, error: err.message });
    return null;
  }
}

export async function getOrder(channelId: string, orderId: string): Promise<Food99Order | null> {
  const config = getApiConfig(channelId);
  if (!config) return null;
  return apiFetch<Food99Order>(channelId, config.order_path.replace('{orderId}', orderId));
}

export async function updateOrderStatus(
  channelId: string,
  orderId: string,
  status: string
): Promise<boolean> {
  const config = getApiConfig(channelId);
  if (!config) return false;

  const path = config.status_path.replace('{orderId}', orderId);
  const token = await getAccessToken(channelId);
  if (!token) return false;

  try {
    const res = await fetch(`${config.api_url}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status, order_id: orderId }),
    });

    if (res.status === 401) {
      clearToken(channelId);
      return false;
    }
    if (!res.ok) {
      logger.error('99Food status update failed', { path, status: res.status });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('99Food status update error', { path, error: err.message });
    return false;
  }
}

import { getAccessToken, clearToken } from './auth.js';
import { UberOrder } from './types.js';
import { logger } from '../../lib/logger.js';

const BASE_URL = 'https://api.uber.com/v2';

async function apiFetch<T>(channelId: string, path: string, options: RequestInit = {}): Promise<T | null> {
  const token = await getAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'pt-BR',
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      clearToken(channelId);
      return null;
    }
    if (res.status === 204) return null as T;
    if (!res.ok) {
      logger.error('Uber API error', { path, status: res.status });
      return null;
    }
    return res.json();
  } catch (err: any) {
    logger.error('Uber API fetch error', { path, error: err.message });
    return null;
  }
}

export async function getOrder(channelId: string, orderId: string): Promise<UberOrder | null> {
  return apiFetch<UberOrder>(channelId, `/eats/orders/${orderId}`);
}

async function posAction(channelId: string, storeId: string, orderId: string, action: string, body?: any): Promise<boolean> {
  const token = await getAccessToken(channelId);
  if (!token || !storeId) return false;

  try {
    const res = await fetch(`https://api.uber.com/v1/eats/store/${storeId}/orders/${orderId}/${action}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept-Language': 'pt-BR',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      clearToken(channelId);
      return false;
    }
    if (!res.ok) {
      logger.error('Uber order action failed', { action, status: res.status });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('Uber order action error', { action, error: err.message });
    return false;
  }
}

export async function acceptOrder(channelId: string, orderId: string, storeId?: string): Promise<boolean> {
  return posAction(channelId, storeId || '', orderId, 'accept_pos_order');
}

export async function denyOrder(
  channelId: string,
  orderId: string,
  storeId?: string,
  reasonType?: string
): Promise<boolean> {
  return posAction(channelId, storeId || '', orderId, 'deny_pos_order', { reason_type: reasonType });
}

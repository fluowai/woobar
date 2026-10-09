import { getAccessToken, clearToken } from './auth.js';
import { RappiEvent, RappiOrderDetail, RappiOrdersResponse } from './types.js';
import { logger } from '../../lib/logger.js';
import db from '../../db/schema.js';

const DEFAULT_API_URL = 'https://services.rappi.com.br';
const INTEGRATIONS_PATH = '/api/v2/restaurants-integrations-public-api';

function getApiUrl(channelId: string): string {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return DEFAULT_API_URL;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  return (config?.api_url || DEFAULT_API_URL).replace(/\/$/, '');
}

export function getStoreId(channelId: string): string | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  return config?.store_id || null;
}

async function apiFetch<T>(
  channelId: string,
  path: string,
  options: RequestInit = {}
): Promise<T | null> {
  const token = await getAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(`${getApiUrl(channelId)}${path}`, {
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
      logger.error('Rappi API error', { path, status: res.status });
      return null;
    }
    return res.json();
  } catch (err: any) {
    logger.error('Rappi API fetch error', { path, error: err.message });
    return null;
  }
}

async function apiAction(channelId: string, path: string, options: RequestInit = {}): Promise<boolean> {
  const token = await getAccessToken(channelId);
  if (!token) return false;

  try {
    const res = await fetch(`${getApiUrl(channelId)}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (res.status === 401) {
      clearToken(channelId);
      return false;
    }
    if (!res.ok) {
      logger.error('Rappi action failed', { path, status: res.status });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('Rappi action error', { path, error: err.message });
    return false;
  }
}

function extractOrders(payload: RappiOrdersResponse | RappiOrderDetail[] | null): RappiOrderDetail[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.order_detail)) return payload.order_detail;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (Array.isArray(payload.data)) return payload.data;
  return [];
}

export async function getNewOrders(channelId: string): Promise<RappiOrderDetail[]> {
  const storeId = getStoreId(channelId);
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await apiFetch<RappiOrdersResponse>(
    channelId,
    `${INTEGRATIONS_PATH}/orders${query}`,
    { method: 'GET' }
  );
  return extractOrders(result);
}

export async function getSentOrders(channelId: string): Promise<RappiOrderDetail[]> {
  const storeId = getStoreId(channelId);
  const query = storeId ? `?store_id=${encodeURIComponent(storeId)}` : '';
  const result = await apiFetch<RappiOrdersResponse>(
    channelId,
    `${INTEGRATIONS_PATH}/orders/status/sent${query}`,
    { method: 'GET' }
  );
  return extractOrders(result);
}

export async function takeOrder(channelId: string, orderId: string, cookingTime: number): Promise<boolean> {
  return apiAction(channelId, `${INTEGRATIONS_PATH}/orders/${orderId}/take/${cookingTime}`, { method: 'PUT' });
}

export async function rejectOrder(channelId: string, orderId: string, reason: string): Promise<boolean> {
  return apiAction(channelId, `${INTEGRATIONS_PATH}/orders/${orderId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ cancel_type: reason }),
  });
}

export async function readyForPickup(channelId: string, orderId: string): Promise<boolean> {
  return apiAction(channelId, `${INTEGRATIONS_PATH}/orders/${orderId}/ready-for-pickup`, { method: 'POST' });
}

export async function getEvents(channelId: string, orderId: string): Promise<RappiEvent[]> {
  const result = await apiFetch<RappiEvent[] | { events?: RappiEvent[] }>(
    channelId,
    `${INTEGRATIONS_PATH}/orders/${orderId}/events`,
    { method: 'GET' }
  );
  if (!result) return [];
  if (Array.isArray(result)) return result;
  return result.events || [];
}

import { getAccessToken, clearToken } from './auth.js';
import { IfoodEvent, IfoodOrder, IfoodMenuItem } from './types.js';
import { logger } from '../../lib/logger.js';

const BASE_URL = 'https://merchant-api.ifood.com.br';

async function apiFetch<T>(channelId: string, path: string, options: RequestInit = {}): Promise<T | null> {
  const token = await getAccessToken(channelId);
  if (!token) return null;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
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
      logger.error('iFood API error', { path, status: res.status });
      return null;
    }
    if (res.status === 202) return {} as T;
    return res.json();
  } catch (err: any) {
    logger.error('iFood API fetch error', { path, error: err.message });
    return null;
  }
}

async function apiAction(channelId: string, path: string, options: RequestInit = {}): Promise<boolean> {
  const token = await getAccessToken(channelId);
  if (!token) return false;

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
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
      logger.error('iFood action failed', { path, status: res.status });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('iFood action error', { path, error: err.message });
    return false;
  }
}

export async function pollEvents(channelId: string): Promise<IfoodEvent[]> {
  const result = await apiFetch<IfoodEvent[]>(channelId, '/order/v1.0/orders:polling', { method: 'GET' });
  if (Array.isArray(result)) return result;
  const legacy = await apiFetch<IfoodEvent[]>(channelId, '/event-polls/v1.0/events/polling', { method: 'GET' });
  return Array.isArray(legacy) ? legacy : [];
}

export async function acknowledgeEvents(channelId: string, eventIds: string[]): Promise<boolean> {
  const payload = JSON.stringify({
    events: eventIds.map(id => ({ id })),
    orderIds: eventIds,
  });
  const updated = await apiAction(channelId, '/order/v1.0/orders:acknowledgment', { method: 'POST', body: payload });
  if (updated) return true;
  return apiAction(channelId, '/event-polls/v1.0/events/acknowledgment', { method: 'POST', body: payload });
}

export async function getOrder(channelId: string, orderId: string): Promise<IfoodOrder | null> {
  const order = await apiFetch<IfoodOrder>(channelId, `/order/v1.0/orders/${orderId}`);
  if (order?.id) return order;
  const legacy = await apiFetch<IfoodOrder>(channelId, `/orders/v1.0/orders/${orderId}`);
  return legacy?.id ? legacy : null;
}

export async function confirmOrder(channelId: string, orderId: string): Promise<boolean> {
  return apiAction(channelId, `/order/v1.0/orders/${orderId}/confirm`, { method: 'POST' });
}

export async function startPreparation(channelId: string, orderId: string): Promise<boolean> {
  return apiAction(channelId, `/order/v1.0/orders/${orderId}/startPreparation`, { method: 'POST' });
}

export async function readyToPickup(channelId: string, orderId: string): Promise<boolean> {
  return apiAction(channelId, `/order/v1.0/orders/${orderId}/readyToPickup`, { method: 'POST' });
}

export async function dispatchOrder(channelId: string, orderId: string): Promise<boolean> {
  return apiAction(channelId, `/order/v1.0/orders/${orderId}/dispatch`, {
    method: 'POST',
    body: JSON.stringify({ deliveredBy: 'MERCHANT' }),
  });
}

export async function getCancellationReasons(channelId: string, orderId: string): Promise<Array<{ id: string; name?: string }>> {
  const result = await apiFetch<Array<{ id: string; name?: string }>>(
    channelId,
    `/order/v1.0/orders/${orderId}/cancellationReasons`
  );
  return result || [];
}

export async function requestCancellation(channelId: string, orderId: string, reasonId: string): Promise<boolean> {
  return apiAction(channelId, `/order/v1.0/orders/${orderId}/requestCancellation`, {
    method: 'POST',
    body: JSON.stringify({ reason: { id: reasonId } }),
  });
}

export async function getMerchantMenus(channelId: string, merchantId: string): Promise<IfoodMenuItem[]> {
  const result = await apiFetch<IfoodMenuItem[]>(channelId, `/merchants/v1.0/merchants/${merchantId}/menus`, { method: 'GET' });
  return result || [];
}

export async function getMerchant(channelId: string, merchantId: string): Promise<any> {
  return apiFetch<any>(channelId, `/merchants/v1.0/merchants/${merchantId}`);
}

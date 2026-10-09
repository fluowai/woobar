import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { Food99TokenResponse } from './types.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

interface Food99Config {
  auth_url: string;
  client_id: string;
  client_secret: string;
}

function getConfig(channelId: string): Food99Config | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ? AND active = 1').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  if (!config?.auth_url || !config?.client_id || !config?.client_secret) return null;
  return {
    auth_url: config.auth_url,
    client_id: config.client_id,
    client_secret: config.client_secret,
  };
}

export async function getAccessToken(channelId: string): Promise<string | null> {
  const cached = tokenCache.get(channelId);
  if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

  const config = getConfig(channelId);
  if (!config) {
    logger.error('99Food credentials not configured for channel', { channelId });
    return null;
  }

  try {
    const res = await fetch(config.auth_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: config.client_id,
        client_secret: config.client_secret,
        grant_type: 'client_credentials',
      }),
    });

    if (!res.ok) {
      logger.error('99Food auth failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as Food99TokenResponse;
    const accessToken = data.access_token || data.token;
    if (!accessToken) {
      logger.error('99Food auth response missing token');
      return null;
    }

    const ttlSeconds = data.expires_in || 3600;
    tokenCache.set(channelId, {
      accessToken,
      expiresAt: Date.now() + (ttlSeconds - 60) * 1000,
    });
    return accessToken;
  } catch (err: any) {
    logger.error('99Food auth error', { error: err.message });
    return null;
  }
}

export function clearToken(channelId: string) {
  tokenCache.delete(channelId);
}

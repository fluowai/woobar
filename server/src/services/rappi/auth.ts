import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { RappiTokenResponse } from './types.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

interface RappiConfig {
  auth_url: string;
  client_id: string;
  client_secret: string;
}

function getConfig(channelId: string): RappiConfig | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ? AND active = 1').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  if (!config?.client_id || !config?.client_secret) return null;
  return {
    auth_url: config.auth_url || 'https://api.rappi.com.br/restaurants/auth/v1/token/login/integrations',
    client_id: config.client_id,
    client_secret: config.client_secret,
  };
}

export async function getAccessToken(channelId: string): Promise<string | null> {
  const cached = tokenCache.get(channelId);
  if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

  const config = getConfig(channelId);
  if (!config) {
    logger.error('Rappi credentials not configured for channel', { channelId });
    return null;
  }

  try {
    const res = await fetch(config.auth_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: config.client_id, client_secret: config.client_secret }),
    });

    if (!res.ok) {
      logger.error('Rappi auth failed', { status: res.status });
      return null;
    }

    const data = (await res.json()) as RappiTokenResponse;
    const accessToken = data.access_token || data.token;
    if (!accessToken) {
      logger.error('Rappi auth response missing token');
      return null;
    }

    const ttlSeconds = data.expires_in || 7 * 24 * 60 * 60;
    tokenCache.set(channelId, {
      accessToken,
      expiresAt: Date.now() + (ttlSeconds - 600) * 1000,
    });
    return accessToken;
  } catch (err: any) {
    logger.error('Rappi auth error', { error: err.message });
    return null;
  }
}

export function clearToken(channelId: string) {
  tokenCache.delete(channelId);
}

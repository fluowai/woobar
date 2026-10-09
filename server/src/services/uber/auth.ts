import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { UberTokenResponse } from './types.js';

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const tokenCache = new Map<string, TokenCache>();

function getCredentials(channelId: string): { clientId: string; clientSecret: string; merchantUuid: string } | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ? AND active = 1').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  if (!config.client_id || !config.client_secret) return null;
  return {
    clientId: config.client_id,
    clientSecret: config.client_secret,
    merchantUuid: config.merchant_uuid || '',
  };
}

export async function getAccessToken(channelId: string): Promise<string | null> {
  const cached = tokenCache.get(channelId);
  if (cached && Date.now() < cached.expiresAt) return cached.accessToken;

  const creds = getCredentials(channelId);
  if (!creds) {
    logger.error('Uber credentials not configured', { channelId });
    return null;
  }

  try {
    const body = new URLSearchParams();
    body.append('grant_type', 'client_credentials');
    body.append('client_id', creds.clientId);
    body.append('client_secret', creds.clientSecret);
    body.append('scope', 'eats.order eats.store eats.menu');

    const res = await fetch('https://login.uber.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      logger.error('Uber auth failed', { status: res.status });
      return null;
    }

    const data: UberTokenResponse = await res.json();
    tokenCache.set(channelId, {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    });
    return data.access_token;
  } catch (err: any) {
    logger.error('Uber auth error', { error: err.message });
    return null;
  }
}

export function clearToken(channelId: string) {
  tokenCache.delete(channelId);
}

import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';

const WHATSAPP_API_BASE = 'https://graph.facebook.com/v18.0';

function getPhoneNumberId(channelId: string): string | null {
  const channel = db.prepare('SELECT config_json FROM channels WHERE id = ? AND active = 1').get(channelId) as any;
  if (!channel) return null;
  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  return config.phone_number_id || null;
}

function getApiKey(channelId: string): string | null {
  const channel = db.prepare('SELECT api_key FROM channels WHERE id = ? AND active = 1').get(channelId) as any;
  return channel?.api_key || null;
}

export async function sendMessage(
  channelId: string,
  to: string,
  text: string
): Promise<boolean> {
  const token = getApiKey(channelId);
  const phoneNumberId = getPhoneNumberId(channelId);
  if (!token || !phoneNumberId) {
    logger.error('WhatsApp not configured', { channelId });
    return false;
  }

  try {
    const res = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    if (!res.ok) {
      logger.error('WhatsApp send failed', { status: res.status, to });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.error('WhatsApp send error', { error: err.message });
    return false;
  }
}

export async function sendOrderTemplate(
  channelId: string,
  to: string,
  templateName: string,
  params: Record<string, string>
): Promise<boolean> {
  const token = getApiKey(channelId);
  const phoneNumberId = getPhoneNumberId(channelId);
  if (!token || !phoneNumberId) return false;

  try {
    const components = Object.entries(params).map(([key, value]) => ({
      type: 'body',
      parameters: [{ type: 'text', text: value }],
    }));

    const res = await fetch(`${WHATSAPP_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'pt_BR' },
          components,
        },
      }),
    });

    return res.ok;
  } catch (err: any) {
    logger.error('WhatsApp template error', { error: err.message });
    return false;
  }
}

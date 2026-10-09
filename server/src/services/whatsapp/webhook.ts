import { v4 as uuid } from 'uuid';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';
import { processNormalizedOrder } from '../orchestrator.js';
import { NormalizedOrder } from '../types.js';

export interface WhatsAppWebhookEntry {
  id: string;
  changes: WhatsAppWebhookChange[];
}

export interface WhatsAppWebhookChange {
  value: {
    messaging_product: string;
    metadata: { display_phone_number: string; phone_number_id: string };
    contacts?: { profile: { name: string }; wa_id: string }[];
    messages?: WhatsAppIncomingMessage[];
    statuses?: any[];
  };
  field: string;
}

export interface WhatsAppIncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'order' | 'button';
  text?: { body: string };
  interactive?: any;
  order?: WhatsAppOrder;
}

export interface WhatsAppOrder {
  catalog_id: string;
  product_items: { product_retailer_id: string; quantity: number; item_price: number; currency: string }[];
}

export function verifyWebhook(mode: string | undefined, token: string | undefined, verifyToken: string): boolean {
  return mode === 'subscribe' && token === verifyToken;
}

export async function handleWhatsAppWebhook(
  channelId: string,
  entry: WhatsAppWebhookEntry[]
): Promise<void> {
  for (const e of entry) {
    for (const change of e.changes) {
      const messages = change.value.messages;
      if (!messages) continue;

      for (const msg of messages) {
        if (msg.type === 'order' && msg.order) {
          await handleWhatsAppOrder(channelId, change.value, msg);
        } else if (msg.type === 'text' && msg.text) {
          await handleTextMessage(channelId, change.value, msg);
        }
      }
    }
  }
}

async function handleWhatsAppOrder(
  channelId: string,
  value: any,
  msg: WhatsAppIncomingMessage
): Promise<void> {
  const contact = value.contacts?.[0];
  const customerName = contact?.profile?.name || `Cliente WhatsApp ${msg.from}`;
  const items = msg.order!.product_items.map((p, i) => ({
    external_id: p.product_retailer_id || `wa-item-${i}`,
    name: p.product_retailer_id || `Produto ${i + 1}`,
    quantity: p.quantity,
    price: p.item_price || 0,
  }));
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const normalized: NormalizedOrder = {
    external_id: msg.id,
    channel: 'whatsapp',
    customer: { name: customerName, phone: msg.from },
    items,
    total,
    payment_method: 'whatsapp',
    raw: msg,
  };

  await processNormalizedOrder(channelId, normalized);
}

async function handleTextMessage(
  channelId: string,
  value: any,
  msg: WhatsAppIncomingMessage
): Promise<void> {
  const contact = value.contacts?.[0];
  const customerName = contact?.profile?.name || `Cliente ${msg.from}`;

  const channel = db.prepare('SELECT establishment_id FROM channels WHERE id = ?').get(channelId) as any;
  if (!channel?.establishment_id) return;

  db.prepare(`INSERT INTO channel_orders (id, channel_id, establishment_id, external_id, order_json, status) VALUES (?,?,?,?,?,?)`)
    .run(
      uuid(), channelId,
      channel.establishment_id,
      msg.id, JSON.stringify({ from: msg.from, name: customerName, text: msg.text?.body }),
      'received'
    );

  // LGPD: loga apenas metadados, nunca o texto completo da mensagem
  logger.info('WhatsApp message received', { from: msg.from, channelId, len: msg.text?.body?.length || 0 });
}

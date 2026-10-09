import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { handleUberWebhook } from '../services/uber/webhook.js';
import { handleRappiWebhook } from '../services/rappi/webhook.js';
import { handleFood99Webhook } from '../services/food99/webhook.js';
import { handleIfoodEvent } from '../services/ifood/polling.js';
import { handleWhatsAppWebhook, verifyWebhook as verifyWpWebhook } from '../services/whatsapp/webhook.js';
import { processNormalizedOrder, onChannelToggle } from '../services/orchestrator.js';
import { logger } from '../lib/logger.js';

const DEFAULT_SIGNATURE_HEADERS = ['x-webhook-signature', 'x-signature'];

function getChannelSecrets(channelId: string): string[] {
  const channel = db
    .prepare('SELECT webhook_secret, config_json FROM channels WHERE id = ?')
    .get(channelId) as any;
  if (!channel) return [];

  const secrets: string[] = [];
  if (channel.webhook_secret) secrets.push(channel.webhook_secret);

  try {
    const config =
      typeof channel.config_json === 'string' ? JSON.parse(channel.config_json || '{}') : channel.config_json || {};
    if (config.webhook_secret) secrets.push(config.webhook_secret);
    if (config.client_secret) secrets.push(config.client_secret);
  } catch {}

  return secrets;
}

function verifyWebhookHmac(req: Request, channelId: string, headers: string[] = DEFAULT_SIGNATURE_HEADERS): boolean {
  return verifyWithSecrets(req, getChannelSecrets(channelId), headers);
}

function verifyWithSecrets(req: Request, secrets: string[], headers: string[] = DEFAULT_SIGNATURE_HEADERS): boolean {
  if (!secrets.length) return false;

  const signature = headers.map(h => req.headers[h]).find(v => !!v) as string | undefined;
  if (!signature) return false;

  // Meta/WhatsApp envia "sha256=<hash>" — normaliza antes de comparar
  const normalizedSig = String(signature).replace(/^sha256=/i, '').trim().toLowerCase();

  const rawBody = (req as any).rawBody as Buffer | undefined;
  const payload = rawBody || Buffer.from(JSON.stringify(req.body ?? {}));

  for (const secret of secrets) {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    try {
      if (crypto.timingSafeEqual(Buffer.from(normalizedSig), Buffer.from(expected))) return true;
    } catch {}
  }
  return false;
}

function secretsOfChannel(channel: any): string[] {
  const secrets: string[] = [];
  if (channel.webhook_secret) secrets.push(channel.webhook_secret);
  try {
    const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json || '{}') : channel.config_json || {};
    if (config.webhook_secret) secrets.push(config.webhook_secret);
    if (config.client_secret) secrets.push(config.client_secret);
  } catch {}
  return secrets;
}

/** Mascara segredos antes de devolver canais ao frontend. */
function maskChannel(channel: any) {
  const masked = { ...channel };
  if (masked.api_key) masked.api_key = '••••';
  try {
    const config = typeof masked.config_json === 'string' ? JSON.parse(masked.config_json || '{}') : (masked.config_json || {});
    for (const key of Object.keys(config)) {
      if (/secret|token|password|key/i.test(key) && config[key]) config[key] = '••••';
    }
    masked.config_json = JSON.stringify(config);
  } catch {}
  if (masked.webhook_secret) masked.webhook_secret = '••••';
  return masked;
}

const router = Router();
const webhookRouter = Router();

router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const channels = db.prepare('SELECT * FROM channels WHERE establishment_id = ? ORDER BY name').all(req.user!.establishment_id);
  const isPrivileged = ['admin', 'manager', 'superadmin'].includes(req.user!.role);
  // Segredos só saem para admin/manager — nunca para garçom/cozinha/entregador
  res.json((channels as any[]).map(c => (isPrivileged ? maskChannel(c) : maskChannel({ ...c, config_json: '{}' }))));
});

router.post('/', roleGuard('admin'), validate(schemas.createChannel), (req: Request, res: Response) => {
  const { name, type, api_key, webhook_url, config_json } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO channels (id, establishment_id, name, type, api_key, webhook_url, config_json) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user!.establishment_id, name, type, api_key || null, webhook_url || null, JSON.stringify(config_json || {}));
  res.status(201).json({ id, name, type });
});

router.put('/:id', roleGuard('admin'), validate(schemas.updateChannel), (req: Request, res: Response) => {
  const { name, api_key, webhook_url, webhook_secret, config_json } = req.body;
  const existing = db.prepare('SELECT id FROM channels WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!existing) { res.status(404).json({ error: 'Canal não encontrado' }); return; }

  const allowedFields = ['name', 'api_key', 'webhook_url', 'webhook_secret'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = ?`);
      vals.push(req.body[field]);
    }
  }
  if (req.body.config_json !== undefined) {
    sets.push('config_json = ?');
    vals.push(typeof req.body.config_json === 'string' ? req.body.config_json : JSON.stringify(req.body.config_json));
  }

  if (sets.length > 0) {
    vals.push(req.params.id);
    db.prepare(`UPDATE channels SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  }
  res.json({ success: true });
});

router.patch('/:id/toggle', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const channel = db.prepare('SELECT active, type, id FROM channels WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!channel) { res.status(404).json({ error: 'Canal não encontrado' }); return; }

  const newActive = channel.active ? 0 : 1;
  db.prepare('UPDATE channels SET active = ? WHERE id = ?').run(newActive, req.params.id);

  onChannelToggle(req.params.id, !!newActive);

  res.json({ success: true, active: newActive });
});

router.delete('/:id', roleGuard('admin'), (req: Request, res: Response) => {
  const existing = db.prepare('SELECT id FROM channels WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!existing) { res.status(404).json({ error: 'Canal não encontrado' }); return; }
  db.prepare('DELETE FROM channels WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ─── iFood Webhook (fallback para iFood Pro) ───
webhookRouter.post('/ifood/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'ifood') as any;
  if (!channel) { res.status(404).json({ error: 'Canal iFood não encontrado ou inativo' }); return; }

  if (!verifyWebhookHmac(req, req.params.channelId, ['x-ifood-signature', ...DEFAULT_SIGNATURE_HEADERS])) {
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  res.status(200).json({ status: 'received' });

  const body = req.body || {};
  const orderId = body.orderId || body.order_id || body.id;
  if (orderId) {
    handleIfoodEvent(channel.id, {
      id: body.eventId || body.id || uuid(),
      orderId,
      code: body.code || body.event || body.status,
    } as any).catch(err => {
      logger.error('iFood webhook handler error', { error: err.message });
    });
  }
});

// ─── Rappi Webhook ───
webhookRouter.post('/rappi/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'rappi') as any;
  if (!channel) { res.status(404).json({ error: 'Canal Rappi não encontrado ou inativo' }); return; }

  if (!verifyWebhookHmac(req, req.params.channelId, ['x-rappi-signature', ...DEFAULT_SIGNATURE_HEADERS])) {
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  res.status(200).json({ status: 'received' });

  handleRappiWebhook(channel.id, req.body).catch(err => {
    logger.error('Rappi webhook handler error', { error: err.message });
  });
});

// ─── 99Food Webhook ───
webhookRouter.post('/food99/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'food99') as any;
  if (!channel) { res.status(404).json({ error: 'Canal 99Food não encontrado ou inativo' }); return; }

  if (!verifyWebhookHmac(req, req.params.channelId, ['x-99food-signature', ...DEFAULT_SIGNATURE_HEADERS])) {
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  res.status(200).json({ status: 'received' });

  handleFood99Webhook(channel.id, req.body).catch(err => {
    logger.error('99Food webhook handler error', { error: err.message });
  });
});

// ─── Uber Eats Webhook ───
webhookRouter.post('/uber/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'uber') as any;
  if (!channel) { res.status(404).json({ error: 'Canal Uber não encontrado ou inativo' }); return; }

  if (!verifyWebhookHmac(req, req.params.channelId, ['x-uber-signature', ...DEFAULT_SIGNATURE_HEADERS])) {
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  res.status(200).json({ status: 'received' });

  handleUberWebhook(channel.id, req.body).catch(err => {
    logger.error('Uber webhook handler error', { error: err.message });
  });
});

// ─── WhatsApp Webhook ───
webhookRouter.get('/whatsapp/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'whatsapp') as any;
  if (!channel) { res.status(404).json({ error: 'Canal WhatsApp não encontrado' }); return; }

  const config = typeof channel.config_json === 'string' ? JSON.parse(channel.config_json) : channel.config_json;
  const verifyToken = config.verify_token;

  if (!verifyToken) {
    res.status(403).send('Webhook não configurado');
    return;
  }

  if (verifyWpWebhook(req.query['hub.mode'] as string, req.query['hub.verify_token'] as string, verifyToken)) {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).send('Verification failed');
  }
});

webhookRouter.post('/whatsapp/:channelId', (req: Request, res: Response) => {
  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(req.params.channelId, 'whatsapp') as any;
  if (!channel) { res.status(404).json({ error: 'Canal WhatsApp não encontrado' }); return; }

  if (!verifyWebhookHmac(req, req.params.channelId)) {
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  res.status(200).json({ status: 'received' });

  handleWhatsAppWebhook(channel.id, req.body.entry || []).catch(err => {
    logger.error('WhatsApp webhook handler error', { error: err.message });
  });
});

// ─── Webhook genérico (legado) ───
// Agora exige assinatura HMAC e canal explícito: aceita
//   POST /webhook/<type>/<channelId>   (preferido)
//   POST /webhook/<type>?channelId=<id>
function legacyWebhookHandler(req: Request, res: Response) {
  const { channel_type } = req.params;
  const channelId = req.params.channelId || (req.query.channelId as string) || req.body?.channelId;
  if (!channelId) {
    res.status(400).json({ error: 'channelId obrigatório (use /webhook/<type>/<channelId>)' });
    return;
  }

  const channel = db.prepare('SELECT * FROM channels WHERE id = ? AND type = ? AND active = 1').get(String(channelId), channel_type) as any;
  if (!channel) { res.status(404).json({ error: 'Canal não configurado ou inativo' }); return; }

  // OBRIGATÓRIO: sem assinatura HMAC válida não cria pedido (fecha injeção pública)
  if (!verifyWithSecrets(req, secretsOfChannel(channel))) {
    logger.warn('Legacy webhook rejected: invalid signature', { channelId: channel.id, type: channel_type });
    res.status(403).json({ error: 'Assinatura inválida' });
    return;
  }

  const externalId = req.body?.id || req.body?.order_id || uuid();
  const channelOrderId = uuid();

  const duplicate = db
    .prepare('SELECT id FROM channel_orders WHERE channel_id = ? AND external_id = ?')
    .get(channel.id, externalId) as any;
  if (duplicate) {
    res.status(200).json({ status: 'duplicate', order_id: null });
    return;
  }

  db.prepare('INSERT INTO channel_orders (id, channel_id, establishment_id, external_id, order_json, status) VALUES (?,?,?,?,?,?)')
    .run(channelOrderId, channel.id, channel.establishment_id, externalId, JSON.stringify(req.body), 'received');

  const body = req.body;
  const customerName = String(body?.customer?.name || body?.customer_name || `Cliente ${channel_type}`).slice(0, 120);
  const total = Math.max(0, parseFloat(body?.total || body?.total_amount || 0) || 0);
  const items = body?.items || body?.products || [];

  const orderId = uuid();
  db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, channel, external_id) VALUES (?,?,?,?,?,?,?,?)`)
    .run(orderId, channel.establishment_id, customerName, JSON.stringify(items), total, 'pending', channel_type, externalId);

  (globalThis as any).broadcastWS?.({ type: 'order_created', data: { id: orderId, channel: channel_type } }, channel.establishment_id);

  res.status(200).json({ status: 'received', order_id: orderId });
}

webhookRouter.post('/:channel_type/:channelId', legacyWebhookHandler);
webhookRouter.post('/:channel_type', legacyWebhookHandler);

// ─── Orders de canais externos ───
router.get('/orders', (req: Request, res: Response) => {
  const { status } = req.query;
  let query = `
    SELECT co.*, c.name as channel_name, c.type as channel_type FROM channel_orders co
    JOIN channels c ON co.channel_id = c.id
    WHERE co.establishment_id = ?
  `;
  const params: any[] = [req.user!.establishment_id];
  if (status && status !== 'all') {
    query += ' AND co.status = ?';
    params.push(status);
  }
  query += ' ORDER BY co.created_at DESC LIMIT 50';
  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

// ─── Event log ───
router.get('/events', (req: Request, res: Response) => {
  const events = db.prepare(`
    SELECT cel.*, c.name as channel_name, c.type as channel_type FROM channel_event_log cel
    JOIN channels c ON cel.channel_id = c.id
    WHERE c.establishment_id = ?
    ORDER BY cel.created_at DESC LIMIT 100
  `).all(req.user!.establishment_id);
  res.json(events);
});

export { webhookRouter };
export default router;
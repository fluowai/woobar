import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { syncOrderStatusToChannel } from '../services/outbound.js';
import { logger } from '../lib/logger.js';
import { normalizeOrderItems, orderTotal } from '../lib/pricing.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const { status } = req.query;
  let query = 'SELECT * FROM orders WHERE establishment_id = ?';
  const params: any[] = [req.user!.establishment_id];
  if (status && status !== 'all') {
    query += ' AND status = ?';
    params.push(status);
  }
  query += ' ORDER BY created_at DESC LIMIT 50';
  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

router.get('/:id', (req: Request, res: Response) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!order) { res.status(404).json({ error: 'Pedido não encontrado' }); return; }
  const messages = db.prepare('SELECT * FROM order_messages WHERE order_id = ? ORDER BY timestamp').all(req.params.id);
  res.json({ ...order as any, messages });
});

router.post('/', validate(schemas.createOrder), (req: Request, res: Response) => {
  const { customer_name, customer_phone, customer_address, items, payment_method, channel } = req.body;

  // Itens e total calculados no servidor com preços do cardápio
  let normalized: any[] = [];
  try {
    normalized = normalizeOrderItems(req.user!.establishment_id, Array.isArray(items) ? items : [], req.user!.role);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
    return;
  }
  if (!normalized.length) { res.status(400).json({ error: 'Pedido sem itens válidos' }); return; }
  const total = orderTotal(normalized);

  const id = uuid();
  db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, customer_phone, customer_address, items_json, total, status, payment_method, channel) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user!.establishment_id, customer_name, customer_phone, customer_address, JSON.stringify(normalized), total, 'pending', payment_method, channel);

  logAudit(req.user!.id, 'create', 'order', id, { customer_name, total });
  (globalThis as any).broadcastWS?.({ type: 'order_created', data: { id, channel } }, req.user!.establishment_id);
  res.status(201).json({ id, customer_name, total, status: 'pending' });
});

router.patch('/:id/status', validate(schemas.updateStatus), (req: Request, res: Response) => {
  const { status, courier_id } = req.body;

  const allowedFields: Record<string, any> = {};
  allowedFields.status = status;
  if (courier_id !== undefined) allowedFields.courier_id = courier_id;

  const sets: string[] = [];
  const vals: any[] = [];
  for (const [key, value] of Object.entries(allowedFields)) {
    sets.push(`${key} = ?`);
    vals.push(value);
  }
  vals.push(req.params.id, req.user!.establishment_id);
  const result = db.prepare(`UPDATE orders SET ${sets.join(', ')} WHERE id = ? AND establishment_id = ?`).run(...vals);
  if (result.changes === 0) { res.status(404).json({ error: 'Pedido não encontrado' }); return; }
  logAudit(req.user!.id, 'update_status', 'order', req.params.id, { status });

  syncOrderStatusToChannel(req.params.id, status).catch(err => {
    logger.error('Failed to sync order status to channel', { orderId: req.params.id, error: err.message });
  });

  (globalThis as any).broadcastWS?.(
    { type: 'order_update', data: { id: req.params.id, status, courier_id } },
    req.user!.establishment_id
  );

  res.json({ success: true });
});

router.post('/:id/messages', (req: Request, res: Response) => {
  const { text, sender = 'store' } = req.body;
  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Mensagem vazia' });
    return;
  }
  const order = db.prepare('SELECT id FROM orders WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!order) { res.status(404).json({ error: 'Pedido não encontrado' }); return; }
  const msgId = uuid();
  db.prepare('INSERT INTO order_messages (id, order_id, sender, text) VALUES (?,?,?,?)').run(msgId, req.params.id, sender === 'customer' ? 'customer' : 'store', text.slice(0, 2000));
  res.status(201).json({ id: msgId, sender, text });
});

function logAudit(userId: string, action: string, entity: string, entityId: string, details?: any) {
  try {
    db.prepare('INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details_json) VALUES (?,?,?,?,?,?)')
      .run(uuid(), userId, action, entity, entityId, JSON.stringify(details || {}));
  } catch {}
}

export default router;

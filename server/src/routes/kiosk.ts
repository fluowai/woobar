import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';

const router = Router();

function establishment(slug?: string) {
  return db.prepare('SELECT id, name, slug FROM establishments WHERE slug = ? AND active = 1').get(slug || 'woobar') as any
    || db.prepare('SELECT id, name, slug FROM establishments WHERE active = 1 ORDER BY created_at LIMIT 1').get() as any;
}

router.get('/catalog', (req: Request, res: Response) => {
  const est = establishment(String(req.query.slug || 'woobar'));
  if (!est) { res.status(404).json({ error: 'Estabelecimento nao encontrado' }); return; }
  const products = db.prepare(`SELECT p.id, p.name, p.description, p.price, p.image, c.name category
    FROM products p LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.establishment_id = ? AND p.active = 1 ORDER BY c.sort_order, p.name`).all(est.id);
  res.json({ establishment: est, products });
});

router.post('/orders', (req: Request, res: Response) => {
  const est = establishment(req.body.slug);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!est || !items.length) { res.status(400).json({ error: 'Pedido sem itens ou estabelecimento invalido' }); return; }
  const ids = items.map((i: any) => String(i.product_id));
  const placeholders = ids.map(() => '?').join(',');
  const products = db.prepare(`SELECT id, name, price FROM products WHERE establishment_id = ? AND active = 1 AND id IN (${placeholders})`).all(est.id, ...ids) as any[];
  const normalized = items.map((item: any) => { const p = products.find(x => x.id === String(item.product_id)); const quantity = Math.max(1, Math.min(20, Number(item.quantity) || 1)); return p ? { product_id: p.id, name: p.name, price: Number(p.price), quantity } : null; }).filter(Boolean) as any[];
  if (!normalized.length) { res.status(400).json({ error: 'Nenhum produto valido' }); return; }
  const total = normalized.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const id = uuid();
  const customer = String(req.body.customer_name || 'Cliente Totem').slice(0, 80);
  const payment = ['pix','card','counter'].includes(req.body.payment_method) ? req.body.payment_method : 'counter';
  db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, customer_phone, items_json, total, status, payment_method, channel)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, est.id, customer, String(req.body.customer_phone || '').slice(0,30), JSON.stringify(normalized), total, 'pending', payment, 'kiosk');
  (globalThis as any).broadcastWS?.({ type: 'order_created', data: { id, channel: 'kiosk' } }, est.id);
  res.status(201).json({ id, order_number: id.slice(0, 6).toUpperCase(), total, status: 'pending' });
});

export default router;

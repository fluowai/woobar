import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  db.prepare(`UPDATE tables SET status = 'free' WHERE establishment_id = ? AND status = 'occupied'
    AND NOT EXISTS (SELECT 1 FROM table_orders WHERE table_orders.table_id = tables.id AND table_orders.status = 'open')`)
    .run(req.user!.establishment_id);
  const tables = db.prepare('SELECT * FROM tables WHERE establishment_id = ? ORDER BY x_position, y_position').all(req.user!.establishment_id);
  res.json(tables);
});

router.patch('/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['free', 'occupied', 'reserved', 'dirty'].includes(status)) { res.status(400).json({ error: 'Status invalido' }); return; }
  const result = db.prepare('UPDATE tables SET status = ? WHERE id = ? AND establishment_id = ?').run(status, req.params.id, req.user!.establishment_id);
  if (!result.changes) { res.status(404).json({ error: 'Mesa nao encontrada' }); return; }
  res.json({ success: true });
});

// === COMANDA (Table Orders) ===

router.get('/orders', (req: Request, res: Response) => {
  const orders = db.prepare(`
    SELECT to2.*, t.name as table_name FROM table_orders to2
    LEFT JOIN tables t ON to2.table_id = t.id
    WHERE to2.establishment_id = ? AND to2.status = 'open'
    ORDER BY to2.opened_at DESC
  `).all(req.user!.establishment_id);
  res.json(orders);
});

router.get('/orders/:id', (req: Request, res: Response) => {
  const order = db.prepare('SELECT to2.*, t.name as table_name FROM table_orders to2 LEFT JOIN tables t ON to2.table_id = t.id WHERE to2.id = ? AND to2.establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!order) { res.status(404).json({ error: 'Comanda não encontrada' }); return; }
  const items = db.prepare('SELECT * FROM table_order_items WHERE table_order_id = ? ORDER BY created_at').all(req.params.id);
  res.json({ ...order, items });
});

router.post('/orders', (req: Request, res: Response) => {
  const { table_id, customer_name } = req.body;
  const table = db.prepare('SELECT id FROM tables WHERE id = ? AND establishment_id = ?').get(table_id, req.user!.establishment_id);
  if (!table) { res.status(404).json({ error: 'Mesa nao encontrada' }); return; }
  const existing = db.prepare("SELECT id FROM table_orders WHERE table_id = ? AND establishment_id = ? AND status = 'open'").get(table_id, req.user!.establishment_id) as any;
  if (existing) { res.status(409).json({ error: 'Esta mesa ja possui uma comanda aberta', id: existing.id }); return; }
  const id = uuid();
  db.prepare('INSERT INTO table_orders (id, establishment_id, table_id, customer_name) VALUES (?,?,?,?)').run(id, req.user!.establishment_id, table_id, customer_name);
  db.prepare('UPDATE tables SET status = ? WHERE id = ? AND establishment_id = ?').run('occupied', table_id, req.user!.establishment_id);
  res.status(201).json({ id, table_id, customer_name });
});

router.post('/orders/:id/items', validate(schemas.addTableOrderItem), (req: Request, res: Response) => {
  const order = db.prepare('SELECT id FROM table_orders WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!order) { res.status(404).json({ error: 'Comanda não encontrada' }); return; }
  const { product_id, product_name, quantity, price, notes } = req.body;

  // Preço vem do cardápio quando há product_id; preço manual só para admin/manager
  let finalPrice = Number(price);
  let finalName = product_name;
  if (product_id) {
    const product = db.prepare('SELECT id, name, price FROM products WHERE id = ? AND establishment_id = ? AND active = 1')
      .get(product_id, req.user!.establishment_id) as any;
    if (!product) { res.status(400).json({ error: 'Produto inválido' }); return; }
    finalPrice = Number(product.price);
    finalName = product.name;
  } else if (!['admin', 'manager', 'superadmin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Item fora do cardápio exige perfil admin/manager' });
    return;
  }

  const itemId = uuid();
  db.prepare('INSERT INTO table_order_items (id, table_order_id, product_id, product_name, quantity, price, notes) VALUES (?,?,?,?,?,?,?)')
    .run(itemId, req.params.id, product_id || null, finalName, quantity, finalPrice, notes);

  const total = db.prepare('SELECT SUM(quantity * price) as total FROM table_order_items WHERE table_order_id = ? AND status != ?').get(req.params.id, 'cancelled') as any;
  db.prepare('UPDATE table_orders SET total = ? WHERE id = ?').run(total?.total || 0, req.params.id);
  res.status(201).json({ id: itemId, price: finalPrice });
});

router.patch('/orders/items/:id/status', (req: Request, res: Response) => {
  const { status } = req.body;
  const item = db.prepare(`
    SELECT toi.id FROM table_order_items toi
    JOIN table_orders to2 ON toi.table_order_id = to2.id
    WHERE toi.id = ? AND to2.establishment_id = ?
  `).get(req.params.id, req.user!.establishment_id) as any;
  if (!item) { res.status(404).json({ error: 'Item não encontrado' }); return; }
  db.prepare('UPDATE table_order_items SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ success: true });
});

router.post('/orders/:id/close', roleGuard('admin', 'manager', 'waiter', 'attendant'), (req: Request, res: Response) => {
  const { payment_method } = req.body;
  if (!['pix', 'card', 'cash'].includes(payment_method)) { res.status(400).json({ error: 'Forma de pagamento invalida' }); return; }
  const order = db.prepare('SELECT * FROM table_orders WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!order) { res.status(404).json({ error: 'Comanda não encontrada' }); return; }
  const close = db.transaction(() => {
    db.prepare('UPDATE table_orders SET status = ?, closed_at = datetime(\'now\'), payment_method = ? WHERE id = ?').run('closed', payment_method, req.params.id);
    db.prepare('UPDATE tables SET status = ? WHERE id = ? AND establishment_id = ?').run('dirty', order.table_id, req.user!.establishment_id);
  });
  close();
  res.json({ success: true });
});

export default router;

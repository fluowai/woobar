import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const { search } = req.query;
  let query = 'SELECT * FROM customers WHERE establishment_id = ?';
  const params: any[] = [req.user!.establishment_id];
  if (search) {
    query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  query += ' ORDER BY total_spent DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

router.get('/:id', (req: Request, res: Response) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!customer) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
  const orders = db.prepare("SELECT * FROM orders WHERE establishment_id = ? AND customer_name = ? ORDER BY created_at DESC LIMIT 20")
    .all(req.user!.establishment_id, (customer as any).name);
  res.json({ ...customer as any, orders });
});

router.post('/', (req: Request, res: Response) => {
  const { name, email, phone, birth_date, notes } = req.body;
  const existing = db.prepare('SELECT id FROM customers WHERE email = ? AND establishment_id = ?').get(email, req.user!.establishment_id);
  if (existing) {
    db.prepare('UPDATE customers SET total_visits = total_visits + 1, last_visit = datetime(\'now\') WHERE id = ?').run((existing as any).id);
    res.json({ id: (existing as any).id, updated: true });
    return;
  }
  const id = uuid();
  db.prepare('INSERT INTO customers (id, establishment_id, name, email, phone, birth_date, notes) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user!.establishment_id, name, email, phone, birth_date, notes);
  res.status(201).json({ id, name });
});

router.put('/:id', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { name, email, phone, birth_date, notes, loyalty_points } = req.body;
  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    res.status(400).json({ error: 'Nome inválido' });
    return;
  }
  const result = db.prepare('UPDATE customers SET name=?, email=?, phone=?, birth_date=?, notes=?, loyalty_points=? WHERE id=? AND establishment_id=?')
    .run(name, email, phone, birth_date, notes, loyalty_points, req.params.id, req.user!.establishment_id);
  if (result.changes === 0) { res.status(404).json({ error: 'Cliente não encontrado' }); return; }
  res.json({ success: true });
});

export default router;

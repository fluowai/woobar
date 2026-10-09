import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { logger } from '../lib/logger.js';

const router = Router();
router.use(authMiddleware);

router.get('/config', (req: Request, res: Response) => {
  const config = db.prepare('SELECT * FROM cover_config WHERE establishment_id = ?').get(req.user!.establishment_id);
  res.json(config || { price: 25.00, capacity: 250 });
});

router.put('/config', roleGuard('admin', 'manager'), validate(schemas.updateCoverConfig), (req: Request, res: Response) => {
  const { price, capacity } = req.body;
  if (!req.user!.establishment_id) { res.status(400).json({ error: 'Usuário sem estabelecimento' }); return; }
  db.prepare(`INSERT INTO cover_config (establishment_id, price, capacity) VALUES (?,?,?)
    ON CONFLICT(establishment_id) DO UPDATE SET price=excluded.price, capacity=excluded.capacity, updated_at=datetime('now')`)
    .run(req.user!.establishment_id, price, capacity);
  res.json({ success: true });
});

router.get('/count', (req: Request, res: Response) => {
  const entries = db.prepare('SELECT COUNT(*) as count FROM cover_charge WHERE type = ? AND establishment_id = ? AND date(created_at) = date(\'now\')').get('entry', req.user!.establishment_id) as any;
  const exits = db.prepare('SELECT COUNT(*) as count FROM cover_charge WHERE type = ? AND establishment_id = ? AND date(created_at) = date(\'now\')').get('exit', req.user!.establishment_id) as any;
  const config = db.prepare('SELECT * FROM cover_config WHERE establishment_id = ?').get(req.user!.establishment_id) as any;
  const current = (entries?.count || 0) - (exits?.count || 0);
  res.json({ current, capacity: config?.capacity || 250, entries: entries?.count || 0, exits: exits?.count || 0 });
});

router.post('/entry', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.coverEntry), (req: Request, res: Response) => {
  const { amount, method } = req.body;
  const config = db.prepare('SELECT * FROM cover_config WHERE establishment_id = ?').get(req.user!.establishment_id) as any;
  const finalAmount = Number(amount) > 0 ? Number(amount) : (config?.price || 25);
  const id = uuid();
  db.prepare('INSERT INTO cover_charge (id, establishment_id, type, amount, method) VALUES (?,?,?,?,?)').run(id, req.user!.establishment_id, 'entry', finalAmount, method);
  res.status(201).json({ id, type: 'entry', amount: finalAmount });
});

router.post('/exit', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.coverExit), (req: Request, res: Response) => {
  const { amount, method } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO cover_charge (id, establishment_id, type, amount, method) VALUES (?,?,?,?,?)').run(id, req.user!.establishment_id, 'exit', amount || 0, method || null);
  res.status(201).json({ id, type: 'exit' });
});

router.get('/transactions', (req: Request, res: Response) => {
  const txns = db.prepare('SELECT * FROM cover_charge WHERE establishment_id = ? AND date(created_at) = date(\'now\') ORDER BY created_at DESC LIMIT 50').all(req.user!.establishment_id);
  const total = db.prepare('SELECT COALESCE(SUM(amount),0) as total FROM cover_charge WHERE type = ? AND establishment_id = ? AND date(created_at) = date(\'now\')').get('entry', req.user!.establishment_id) as any;
  res.json({ transactions: txns, total_today: total?.total || 0 });
});

export default router;

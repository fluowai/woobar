import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/', roleGuard('admin'), (req: Request, res: Response) => {
  if (req.user!.role === 'superadmin') {
    res.json(db.prepare('SELECT id, name, slug, address, phone, active FROM establishments WHERE active = 1').all());
    return;
  }
  // Admin só enxerga o próprio estabelecimento (isolamento de tenant)
  res.json(db.prepare('SELECT id, name, slug, address, phone, active FROM establishments WHERE id = ?').all(req.user!.establishment_id));
});

router.get('/settings', (req: Request, res: Response) => {
  const settings = db.prepare('SELECT * FROM establishment_settings WHERE establishment_id = ?').get(req.user!.establishment_id);
  res.json(settings || {});
});

router.put('/settings', roleGuard('admin'), (req: Request, res: Response) => {
  const { name, logo_url, primary_color, tax_rate, service_fee, delivery_fee, free_delivery_min, opening_hours, print_ip, print_port } = req.body;
  if (!req.user!.establishment_id) { res.status(400).json({ error: 'Usuário sem estabelecimento' }); return; }
  db.prepare(`INSERT INTO establishment_settings (establishment_id, name, logo_url, primary_color, tax_rate, service_fee, delivery_fee, free_delivery_min, opening_hours, print_ip, print_port)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(establishment_id) DO UPDATE SET name=excluded.name, logo_url=excluded.logo_url, primary_color=excluded.primary_color,
    tax_rate=excluded.tax_rate, service_fee=excluded.service_fee, delivery_fee=excluded.delivery_fee,
    free_delivery_min=excluded.free_delivery_min, opening_hours=excluded.opening_hours,
    print_ip=excluded.print_ip, print_port=excluded.print_port, updated_at=datetime('now')`)
    .run(req.user!.establishment_id, name, logo_url, primary_color, tax_rate, service_fee, delivery_fee, free_delivery_min, opening_hours ? JSON.stringify(opening_hours) : '{}', print_ip, print_port);
  res.json({ success: true });
});

export default router;

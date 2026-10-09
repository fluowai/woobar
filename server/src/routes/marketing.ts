import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

function audienceCount(establishmentId: string, segment: string) {
  const clauses: Record<string, string> = {
    all: '',
    inactive: "AND (last_visit IS NULL OR last_visit < datetime('now', '-30 days'))",
    vip: 'AND (total_spent >= 1000 OR total_visits >= 10)',
    birthday: "AND strftime('%m', birth_date) = strftime('%m', 'now')",
  };
  const row = db.prepare(`SELECT COUNT(*) as total FROM customers WHERE establishment_id = ? ${clauses[segment] || ''}`)
    .get(establishmentId) as { total: number };
  return row.total;
}

router.get('/overview', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const establishmentId = req.user!.establishment_id;
  const segments = {
    all: audienceCount(establishmentId, 'all'),
    inactive: audienceCount(establishmentId, 'inactive'),
    vip: audienceCount(establishmentId, 'vip'),
    birthday: audienceCount(establishmentId, 'birthday'),
  };
  const campaigns = db.prepare('SELECT * FROM marketing_campaigns WHERE establishment_id = ? ORDER BY created_at DESC')
    .all(establishmentId);
  const coupons = db.prepare('SELECT * FROM coupons WHERE establishment_id = ? ORDER BY created_at DESC')
    .all(establishmentId);
  res.json({ segments, campaigns, coupons });
});

router.get('/audience/:segment', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const allowed = ['all', 'inactive', 'vip', 'birthday'];
  if (!allowed.includes(req.params.segment)) {
    res.status(400).json({ error: 'Segmento invalido' });
    return;
  }
  res.json({ segment: req.params.segment, count: audienceCount(req.user!.establishment_id, req.params.segment) });
});

router.post('/campaigns', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { name, channel = 'whatsapp', segment = 'all', message, scheduled_at } = req.body;
  if (!name?.trim() || !message?.trim()) {
    res.status(400).json({ error: 'Nome e mensagem sao obrigatorios' });
    return;
  }
  if (!['whatsapp', 'email', 'sms'].includes(channel) || !['all', 'inactive', 'vip', 'birthday'].includes(segment)) {
    res.status(400).json({ error: 'Canal ou segmento invalido' });
    return;
  }
  const id = uuid();
  const status = scheduled_at ? 'scheduled' : 'draft';
  const count = audienceCount(req.user!.establishment_id, segment);
  db.prepare(`INSERT INTO marketing_campaigns
    (id, establishment_id, name, channel, segment, message, status, scheduled_at, audience_count)
    VALUES (?,?,?,?,?,?,?,?,?)`)
    .run(id, req.user!.establishment_id, name.trim(), channel, segment, message.trim(), status, scheduled_at || null, count);
  res.status(201).json({ id, name, channel, segment, message, status, scheduled_at: scheduled_at || null, audience_count: count, sent_count: 0 });
});

router.patch('/campaigns/:id/status', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { status } = req.body;
  if (!['draft', 'scheduled', 'sent', 'paused'].includes(status)) {
    res.status(400).json({ error: 'Status invalido' });
    return;
  }
  const result = db.prepare(`UPDATE marketing_campaigns SET status = ?, sent_count = CASE WHEN ? = 'sent' THEN audience_count ELSE sent_count END
    WHERE id = ? AND establishment_id = ?`).run(status, status, req.params.id, req.user!.establishment_id);
  if (!result.changes) { res.status(404).json({ error: 'Campanha nao encontrada' }); return; }
  res.json({ success: true, status });
});

router.post('/coupons', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { code, description = '', discount_type = 'percentage', discount_value, min_order = 0, cashback_percent = 0, usage_limit, valid_until } = req.body;
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode || !Number.isFinite(Number(discount_value)) || Number(discount_value) <= 0) {
    res.status(400).json({ error: 'Codigo e desconto valido sao obrigatorios' });
    return;
  }
  if (!['percentage', 'fixed'].includes(discount_type)) {
    res.status(400).json({ error: 'Tipo de desconto invalido' });
    return;
  }
  try {
    const id = uuid();
    db.prepare(`INSERT INTO coupons
      (id, establishment_id, code, description, discount_type, discount_value, min_order, cashback_percent, usage_limit, valid_until)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id, req.user!.establishment_id, normalizedCode, description, discount_type, Number(discount_value), Number(min_order), Number(cashback_percent), usage_limit || null, valid_until || null);
    res.status(201).json({ id, code: normalizedCode, description, discount_type, discount_value: Number(discount_value), min_order: Number(min_order), cashback_percent: Number(cashback_percent), usage_limit: usage_limit || null, valid_until: valid_until || null, active: 1, used_count: 0 });
  } catch {
    res.status(409).json({ error: 'Ja existe um cupom com este codigo' });
  }
});

router.patch('/coupons/:id/toggle', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const result = db.prepare('UPDATE coupons SET active = CASE active WHEN 1 THEN 0 ELSE 1 END WHERE id = ? AND establishment_id = ?')
    .run(req.params.id, req.user!.establishment_id);
  if (!result.changes) { res.status(404).json({ error: 'Cupom nao encontrado' }); return; }
  res.json({ success: true });
});

export default router;

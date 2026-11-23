import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

router.get('/tickets', (req: Request, res: Response) => {
  const status = String(req.query.status || 'all');
  const filters = req.user!.role === 'superadmin' ? [] : ['t.establishment_id = ?'];
  const params: string[] = req.user!.role === 'superadmin' ? [] : [req.user!.establishment_id || ''];
  if (status !== 'all') { filters.push('t.status = ?'); params.push(status); }
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT t.*, e.name establishment_name, e.slug establishment_slug,
      u.name requester_name, u.email requester_email,
      (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) message_count
    FROM support_tickets t
    LEFT JOIN establishments e ON e.id = t.establishment_id
    LEFT JOIN users u ON u.id = t.requester_user_id
    ${where} ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 ELSE 2 END, t.updated_at DESC
  `).all(...params);
  res.json(rows);
});

router.post('/tickets', (req: Request, res: Response) => {
  const { subject, description, priority = 'normal' } = req.body || {};
  if (!subject || !description) { res.status(400).json({ error: 'Assunto e descrição são obrigatórios' }); return; }
  const id = uuid();
  db.prepare(`INSERT INTO support_tickets (id, establishment_id, requester_user_id, subject, description, priority)
    VALUES (?, ?, ?, ?, ?, ?)`).run(id, req.user!.establishment_id, req.user!.id, subject, description, priority);
  res.status(201).json({ id, status: 'open' });
});

router.get('/tickets/:id/messages', (req: Request, res: Response) => {
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket || (req.user!.role !== 'superadmin' && ticket.establishment_id !== req.user!.establishment_id)) { res.status(404).json({ error: 'Chamado não encontrado' }); return; }
  res.json(db.prepare(`SELECT m.*, u.name user_name, u.role user_role FROM support_messages m LEFT JOIN users u ON u.id=m.user_id WHERE ticket_id=? ORDER BY created_at`).all(req.params.id));
});

router.post('/tickets/:id/messages', (req: Request, res: Response) => {
  const ticket = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(req.params.id) as any;
  if (!ticket || (req.user!.role !== 'superadmin' && ticket.establishment_id !== req.user!.establishment_id)) { res.status(404).json({ error: 'Chamado não encontrado' }); return; }
  const { body, internal = false, status } = req.body || {};
  if (!body) { res.status(400).json({ error: 'Mensagem obrigatória' }); return; }
  const messageId = uuid();
  db.transaction(() => {
    db.prepare('INSERT INTO support_messages (id, ticket_id, user_id, body, internal) VALUES (?,?,?,?,?)').run(messageId, req.params.id, req.user!.id, body, req.user!.role === 'superadmin' && internal ? 1 : 0);
    db.prepare(`UPDATE support_tickets SET status = COALESCE(?, CASE WHEN ? = 'superadmin' THEN 'waiting_customer' ELSE 'in_progress' END), last_reply_at=datetime('now'), updated_at=datetime('now'), assigned_to=CASE WHEN ? = 'superadmin' THEN ? ELSE assigned_to END WHERE id=?`).run(status || null, req.user!.role, req.user!.role, req.user!.id, req.params.id);
  })();
  res.status(201).json({ id: messageId });
});

router.patch('/tickets/:id', roleGuard('superadmin'), (req: Request, res: Response) => {
  const { status, priority, assigned_to } = req.body || {};
  if (!status && !priority && assigned_to === undefined) { res.status(400).json({ error: 'Nenhuma alteração informada' }); return; }
  db.prepare(`UPDATE support_tickets SET status=COALESCE(?,status), priority=COALESCE(?,priority), assigned_to=COALESCE(?,assigned_to), updated_at=datetime('now') WHERE id=?`).run(status || null, priority || null, assigned_to || null, req.params.id);
  res.json({ success: true });
});

export default router;

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { canAssignRole } from '../lib/roles.js';

const router = Router();
router.use(authMiddleware);

const USER_COLUMNS = 'id, name, email, role, status, avatar, current_location_lat, current_location_lng, is_available, created_at';

router.get('/', (req: Request, res: Response) => {
  const isSuper = req.user!.role === 'superadmin';
  const users = isSuper
    ? db.prepare(`SELECT ${USER_COLUMNS} FROM users ORDER BY name`).all()
    : db.prepare(`SELECT ${USER_COLUMNS} FROM users WHERE establishment_id = ? ORDER BY name`).all(req.user!.establishment_id);
  res.json(users);
});

router.get('/couriers', (_req: Request, res: Response) => {
  const couriers = db.prepare('SELECT id, name, email, role, status, avatar, current_location_lat, current_location_lng, is_available FROM users WHERE role = ? AND establishment_id = ?').all('courier', _req.user!.establishment_id);
  res.json(couriers);
});

router.post('/', roleGuard('admin'), validate(schemas.createUser), (req: Request, res: Response) => {
  const { name, email, password, role, establishment_id } = req.body;

  if (!canAssignRole(req.user!.role, role)) {
    res.status(403).json({ error: 'Você não pode atribuir este papel' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) { res.status(409).json({ error: 'Email já existe' }); return; }

  const isSuper = req.user!.role === 'superadmin';
  const targetEst = isSuper ? (establishment_id ?? req.user!.establishment_id ?? null) : req.user!.establishment_id;
  if (targetEst) {
    const est = db.prepare('SELECT id FROM establishments WHERE id = ?').get(targetEst);
    if (!est) { res.status(400).json({ error: 'Estabelecimento não encontrado' }); return; }
  }

  const hash = bcrypt.hashSync(password, 10);
  const id = uuid();
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)').run(id, targetEst, name, email, hash, role || 'attendant');
  res.status(201).json({ id, name, email, role, establishment_id: targetEst });
});

router.patch('/:id', roleGuard('admin'), (req: Request, res: Response) => {
  if (req.body.role !== undefined && !canAssignRole(req.user!.role, req.body.role)) {
    res.status(403).json({ error: 'Papel inválido ou não permitido' });
    return;
  }
  if (req.body.status !== undefined && !['active', 'inactive'].includes(req.body.status)) {
    res.status(400).json({ error: 'Status inválido' });
    return;
  }

  const isSuper = req.user!.role === 'superadmin';
  const target = db.prepare('SELECT id, role, establishment_id FROM users WHERE id = ?').get(req.params.id) as any;
  if (!target) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  // Isolamento de tenant: admin só edita usuários do próprio estabelecimento
  if (!isSuper && target.establishment_id !== req.user!.establishment_id) {
    res.status(403).json({ error: 'Usuário de outro estabelecimento' });
    return;
  }
  // Admin não edita superadmin de outro escopo
  if (!isSuper && target.role === 'superadmin') {
    res.status(403).json({ error: 'Acesso não autorizado' });
    return;
  }

  const allowed = ['name', 'role', 'status'];
  const sets: string[] = [];
  const vals: any[] = [];
  for (const field of allowed) {
    if (req.body[field] !== undefined) {
      sets.push(`${field} = ?`);
      vals.push(req.body[field]);
    }
  }
  if (req.body.is_available !== undefined) {
    sets.push('is_available = ?');
    vals.push(req.body.is_available ? 1 : 0);
  }
  if (sets.length === 0) { res.status(400).json({ error: 'Nada a atualizar' }); return; }
  vals.push(req.params.id);
  if (!isSuper) vals.push(req.user!.establishment_id);
  const where = isSuper ? 'WHERE id = ?' : 'WHERE id = ? AND establishment_id = ?';
  const result = db.prepare(`UPDATE users SET ${sets.join(', ')} ${where}`).run(...vals);
  if (result.changes === 0) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  res.json({ success: true });
});

router.patch('/:id/location', (req: Request, res: Response) => {
  if (req.params.id !== req.user!.id && !['admin', 'superadmin'].includes(req.user!.role)) {
    res.status(403).json({ error: 'Você só pode atualizar sua própria localização' });
    return;
  }
  const { lat, lng } = req.body;
  db.prepare('UPDATE users SET current_location_lat = ?, current_location_lng = ? WHERE id = ? AND establishment_id = ?').run(lat, lng, req.params.id, req.user!.establishment_id);
  res.json({ success: true });
});

export default router;

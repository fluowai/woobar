import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/schema.js';
import { generateToken, generateRefreshToken, verifyRefreshToken, authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { canAssignRole } from '../lib/roles.js';
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger.js';

const router = Router();

router.post('/login', validate(schemas.login), (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
  let passwordOk = false;
  if (user) {
    try {
      passwordOk = bcrypt.compareSync(password, user.password_hash);
    } catch {
      passwordOk = false;
      logger.error('Falha ao comparar senha (hash invalido)', { userId: user.id });
    }
  }
  if (!user || !passwordOk) {
    logAudit('unknown', 'login_failed', 'user', email);
    res.status(401).json({ error: 'Credenciais inválidas' });
    return;
  }

  if (user.status === 'inactive') {
    logAudit(user.id, 'login_blocked_inactive', 'user', user.id);
    res.status(403).json({ error: 'Usuário inativo' });
    return;
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    establishment_id: user.establishment_id,
  });
  const refreshToken = generateRefreshToken(user.id);

  logAudit(user.id, 'login_success', 'user', user.id);

  // Set httpOnly cookie for the token
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000,
  });

  res.json({
    token,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
});

router.post('/refresh', (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    res.status(400).json({ error: 'Refresh token não fornecido' });
    return;
  }

  const result = verifyRefreshToken(refreshToken);
  if (!result) {
    res.status(401).json({ error: 'Refresh token inválido ou expirado' });
    return;
  }

  const user = db.prepare('SELECT id, name, email, role, establishment_id FROM users WHERE id = ? AND status = ?').get(result.userId, 'active') as any;
  if (!user) {
    res.status(401).json({ error: 'Usuário não encontrado ou inativo' });
    return;
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    establishment_id: user.establishment_id,
  });
  const newRefreshToken = generateRefreshToken(user.id);

  res.json({ token, refreshToken: newRefreshToken });
});

router.post('/register', authMiddleware, roleGuard('admin'), validate(schemas.register), (req: Request, res: Response) => {
  const { name, email, password, role } = req.body;

  if (!canAssignRole(req.user!.role, role)) {
    res.status(403).json({ error: 'Você não pode atribuir este papel' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    res.status(409).json({ error: 'Email já cadastrado' });
    return;
  }

  const isSuper = req.user!.role === 'superadmin';
  const requested = isSuper ? req.body.establishment_id : undefined;
  // Admin sempre cria dentro do próprio estabelecimento (nunca cross-tenant)
  const estId = requested
    ? (db.prepare('SELECT id FROM establishments WHERE id = ?').get(requested) as any)
    : ((db.prepare('SELECT id FROM establishments WHERE id = ?').get(req.user!.establishment_id) as any)
        || (isSuper ? (db.prepare('SELECT id FROM establishments LIMIT 1').get() as any) : undefined));
  if (!estId) {
    res.status(400).json({ error: 'Estabelecimento não encontrado' });
    return;
  }
  const hash = bcrypt.hashSync(password, 10);
  const id = uuid();

  db.prepare(`INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)`)
    .run(id, estId.id, name, email, hash, role);

  logAudit(id, 'register', 'user', id);

  res.status(201).json({ id, name, email, role });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(req.user!.id) as any;
  if (!user) { res.status(404).json({ error: 'Usuário não encontrado' }); return; }
  const settings = db.prepare('SELECT * FROM establishment_settings WHERE establishment_id = ?').get(req.user!.establishment_id);
  res.json({ user, establishment: settings });
});

router.post('/logout', authMiddleware, (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(refreshToken);
  }
  db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(req.user!.id);
  res.clearCookie('token');
  res.json({ success: true });
});

function logAudit(userId: string, action: string, entity: string, entityId: string, details?: any) {
  try {
    db.prepare('INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, details_json) VALUES (?,?,?,?,?,?)')
      .run(uuid(), userId, action, entity, entityId, JSON.stringify(details || {}));
  } catch {}
}

export default router;

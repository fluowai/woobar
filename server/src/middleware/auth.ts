import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { UserPayload } from '../types/index.js';
import { env } from '../lib/env.js';

const JWT_SECRET = env.JWT_SECRET;
const JWT_EXPIRES_IN = '2h';
const REFRESH_EXPIRES_IN = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateToken(payload: UserPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function generateRefreshToken(userId: string): string {
  const token = uuid();
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRES_IN).toISOString();
  db.prepare('INSERT INTO refresh_tokens (id, user_id, expires_at) VALUES (?,?,?)').run(token, userId, expiresAt);
  return token;
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  const row = db.prepare('SELECT user_id FROM refresh_tokens WHERE id = ? AND expires_at > datetime(\'now\')').get(token) as any;
  if (!row) return null;
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(token);
  return { userId: row.user_id };
}

export function getTokenFromReq(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromReq(req);
  if (!token) {
    res.status(401).json({ error: 'Token não fornecido' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function roleGuard(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role;
    if (!role || (role !== 'superadmin' && !roles.includes(role))) {
      res.status(403).json({ error: 'Acesso não autorizado' });
      return;
    }
    next();
  };
}

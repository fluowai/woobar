import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './schema.js';
import { logger } from '../lib/logger.js';

/**
 * Provisiona o Mega Admin somente quando as credenciais são injetadas pelo
 * ambiente de deploy. Não há senha padrão nem segredo embutido na imagem.
 */
export function bootstrapMegaAdmin(email?: string, password?: string) {
  if (!email && !password) return;
  if (!email || !password) throw new Error('MEGA_ADMIN_EMAIL e MEGA_ADMIN_PASSWORD devem ser informados juntos');
  if (password.length < 12) throw new Error('MEGA_ADMIN_PASSWORD deve ter no mínimo 12 caracteres');

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined;
  const legacy = db.prepare("SELECT id FROM users WHERE email = 'superadmin@woobar.com' AND role = 'superadmin'").get() as { id: string } | undefined;
  const id = existing?.id || legacy?.id || uuid();
  const hash = bcrypt.hashSync(password, 12);

  if (existing || legacy) {
    db.prepare("UPDATE users SET name='Mega Admin', email=?, password_hash=?, role='superadmin', establishment_id=NULL, status='active' WHERE id=?")
      .run(email, hash, id);
  } else {
    db.prepare("INSERT INTO users (id, establishment_id, name, email, password_hash, role, status) VALUES (?, NULL, 'Mega Admin', ?, ?, 'superadmin', 'active')")
      .run(id, email, hash);
  }
  logger.info('Mega Admin provisionado pelo ambiente', { email });
}

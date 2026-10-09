import 'dotenv/config';
import { initDatabase } from './schema.js';
import db from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

initDatabase();

const SUPER_PASS = 'Super1234';
const ADMIN_PASS = 'admin123';
const STAFF_PASS = '123456';

let est = db.prepare('SELECT id FROM establishments WHERE slug = ?').get('woobar') as { id: string } | undefined;
if (!est) {
  const id = uuid();
  db.prepare('INSERT INTO establishments (id, name, slug, address, phone) VALUES (?,?,?,?,?)')
    .run(id, 'Woobar Unit 1', 'woobar', 'Rua Augusta, 1500 - Consolação, São Paulo', '(11) 99999-0000');
  est = { id };
  console.log('Estabelecimento "woobar" criado.');
}
const EST_ID = est.id;

interface Target {
  name: string;
  email: string;
  password: string;
  role: string;
  establishment?: string | null;
}

const targets: Target[] = [
  { name: 'Super Admin', email: 'superadmin@woobar.com', password: SUPER_PASS, role: 'superadmin', establishment: null },
  { name: 'Admin', email: 'admin@woobar.com', password: ADMIN_PASS, role: 'admin' },
  { name: 'Roberto Gerente', email: 'roberto@woobar.com', password: STAFF_PASS, role: 'manager' },
  { name: 'Pedro Garçom', email: 'pedro@woobar.com', password: STAFF_PASS, role: 'waiter' },
  { name: 'Fernanda Copa', email: 'fernanda@woobar.com', password: STAFF_PASS, role: 'pantry' },
  { name: 'Carlos Cozinha', email: 'carlos@woobar.com', password: STAFF_PASS, role: 'kitchen' },
  { name: 'Ana Atendente', email: 'ana@woobar.com', password: STAFF_PASS, role: 'attendant' },
  { name: 'Marcos Entregas', email: 'marcos@woobar.com', password: STAFF_PASS, role: 'courier' },
  { name: 'Julia Entregas', email: 'julia@woobar.com', password: STAFF_PASS, role: 'courier' },
];

const selectUser = db.prepare('SELECT id, name, role, establishment_id FROM users WHERE email = ?');
const insertUser = db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)');
const updateUser = db.prepare('UPDATE users SET name = ?, role = ?, establishment_id = ? WHERE id = ?');

type Action = 'criado' | 'atualizado' | 'mantido';
const results: Array<{ target: Target; action: Action }> = [];

db.transaction(() => {
  for (const target of targets) {
    const estId = target.establishment === undefined ? EST_ID : target.establishment;
    const existing = selectUser.get(target.email) as { id: string; name: string; role: string; establishment_id: string | null } | undefined;

    if (!existing) {
      insertUser.run(uuid(), estId, target.name, target.email, bcrypt.hashSync(target.password, 10), target.role);
      results.push({ target, action: 'criado' });
      continue;
    }

    const mismatch =
      existing.name !== target.name ||
      existing.role !== target.role ||
      (existing.establishment_id ?? null) !== (estId ?? null);

    if (mismatch) {
      updateUser.run(target.name, target.role, estId, existing.id);
      results.push({ target, action: 'atualizado' });
      continue;
    }

    results.push({ target, action: 'mantido' });
  }
})();

const label = (target: Target) =>
  target.establishment === null ? '(sem estabelecimento)' : 'Woobar Unit 1';

console.log('\nUsuários (seed:users)');
console.log('-'.repeat(78));
for (const { target, action } of results) {
  console.log(
    `${target.email.padEnd(24)} ${target.role.padEnd(11)} ${action.padEnd(11)} ${label(target)}`
  );
}
console.log('-'.repeat(78));

console.log('\nCredenciais (senhas de usuários já existentes são mantidas):');
for (const { target, action } of results) {
  if (action === 'criado') console.log(`  ${target.email} / ${target.password}`);
}

const counts = results.reduce<Record<Action, number>>(
  (acc, r) => ({ ...acc, [r.action]: acc[r.action] + 1 }),
  { criado: 0, atualizado: 0, mantido: 0 }
);
console.log(`\nCriados: ${counts.criado} | Atualizados: ${counts.atualizado} | Mantidos: ${counts.mantido}`);
process.exit(0);

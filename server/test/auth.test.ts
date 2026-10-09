import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import db from '../src/db/schema.js';

let server: http.Server;
let base: string;
const estId = uuid();

const post = (path: string, body: any, authToken?: string) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(body),
  });

const get = (path: string, authToken?: string) =>
  fetch(`${base}${path}`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

beforeAll(async () => {
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Auth', 'bar-auth');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(uuid(), estId, 'Dono', 'dono@auth.test', bcrypt.hashSync('Senha123', 10), 'admin');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(uuid(), estId, 'Garçom', 'garcom@auth.test', bcrypt.hashSync('Senha123', 10), 'waiter');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('autenticação e autorização', () => {
  it('rejeita login com senha errada', async () => {
    const res = await post('/api/auth/login', { email: 'dono@auth.test', password: 'Errada999' });
    expect(res.status).toBe(401);
  });

  it('rejeita requisição sem token', async () => {
    const res = await get('/api/users');
    expect(res.status).toBe(401);
  });

  it('rejeita token inválido', async () => {
    const res = await get('/api/users', 'token-invalido');
    expect(res.status).toBe(401);
  });

  it('bloqueia papel não autorizado (garçom não cria usuários)', async () => {
    const login = await post('/api/auth/login', { email: 'garcom@auth.test', password: 'Senha123' });
    expect(login.status).toBe(200);
    const { token } = await login.json();

    const res = await post('/api/users', { name: 'Novo', email: 'novo@auth.test', password: 'Senha123' }, token);
    expect(res.status).toBe(403);
  });

  it('permite admin listar usuários do seu tenant', async () => {
    const login = await post('/api/auth/login', { email: 'dono@auth.test', password: 'Senha123' });
    expect(login.status).toBe(200);
    const { token } = await login.json();

    const res = await get('/api/users', token);
    expect(res.status).toBe(200);
    const users = await res.json();
    expect(users.length).toBeGreaterThanOrEqual(2);
  });
});

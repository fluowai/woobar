import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import db from '../src/db/schema.js';

let server: http.Server;
let base: string;
let token: string;
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

beforeAll(async () => {
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Teste', 'bar-teste');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(uuid(), estId, 'Dono', 'dono@fin.test', bcrypt.hashSync('Senha123', 10), 'admin');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;

  const login = await post('/api/auth/login', { email: 'dono@fin.test', password: 'Senha123' });
  expect(login.status).toBe(200);
  const data = await login.json();
  token = data.token;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('fechamento de caixa', () => {
  it('calcula totais reais por método de pagamento e saldo esperado em giro', async () => {
    const open = await post('/api/financial/cash-register/open', { opening_balance: 100 }, token);
    expect(open.status).toBe(201);

    db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, payment_method, channel) VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), estId, 'Cliente A', '[]', 50, 'delivered', 'cash', 'website');
    db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, payment_method, channel) VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), estId, 'Cliente B', '[]', 30, 'delivered', 'pix', 'website');
    db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, payment_method, channel) VALUES (?,?,?,?,?,?,?,?)`)
      .run(uuid(), estId, 'Cliente iFood', '[]', 99, 'delivered', 'ifood', 'ifood');

    const tableOrder = uuid();
    db.prepare(`INSERT INTO table_orders (id, establishment_id, status, total, payment_method, closed_at) VALUES (?,?,?,?,?,datetime('now'))`)
      .run(tableOrder, estId, 'closed', 40, 'credit');

    db.prepare(`INSERT INTO bar_tokens (id, establishment_id, item_name, price, code, payment_method) VALUES (?,?,?,?,?,?)`)
      .run(uuid(), estId, 'Dose', 10, 'TOK100', 'cash');

    db.prepare(`INSERT INTO cover_charge (id, establishment_id, type, amount, method) VALUES (?,?,?,?,?)`)
      .run(uuid(), estId, 'entry', 5, 'cash');
    db.prepare(`INSERT INTO cover_charge (id, establishment_id, type, amount, method) VALUES (?,?,?,?,?)`)
      .run(uuid(), estId, 'exit', 2, 'cash');

    const close = await post('/api/financial/cash-register/close', { notes: 'teste' }, token);
    expect(close.status).toBe(200);
    const result = await close.json();

    expect(result.revenue_by_method.cash).toBeCloseTo(63);
    expect(result.revenue_by_method.pix).toBeCloseTo(30);
    expect(result.revenue_by_method.card).toBeCloseTo(0);
    expect(result.revenue_by_method.credit).toBeCloseTo(40);
    expect(result.revenue_by_method.debit).toBeCloseTo(0);
    expect(result.revenue_by_method.other).toBeCloseTo(99);
    expect(result.total).toBeCloseTo(232);
    expect(result.drawer.opening_balance).toBe(100);
    expect(result.drawer.expected_cash).toBeCloseTo(163);

    const row = db.prepare('SELECT * FROM cash_registers WHERE id = (SELECT id FROM cash_registers WHERE establishment_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 1)')
      .get(estId, 'closed') as any;
    expect(row.status).toBe('closed');
    expect(row.closing_balance).toBeCloseTo(163);
    expect(row.total_cash).toBeCloseTo(63);
    expect(row.total_pix).toBeCloseTo(30);
    expect(row.total_card).toBeCloseTo(0);
    expect(row.total_credit).toBeCloseTo(40);
    expect(row.total_debit).toBeCloseTo(0);
  });

  it('recusa fechar sem caixa aberto', async () => {
    const close = await post('/api/financial/cash-register/close', {}, token);
    expect(close.status).toBe(400);
  });
});

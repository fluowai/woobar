import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import db from '../src/db/schema.js';

let server: http.Server;
let base: string;

const estId = uuid();
const otherEstId = uuid();
const product = { id: uuid(), name: 'Gin Tônica', price: 32 };

const req = (method: string, path: string, body?: any, token?: string) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

async function login(email: string, password: string): Promise<string> {
  const res = await req('POST', '/api/auth/login', { email, password });
  expect(res.status).toBe(200);
  const data = await res.json();
  return data.token;
}

beforeAll(async () => {
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Ops', 'bar-ops');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Bar Outro', 'bar-outro-ops');
  db.prepare('INSERT INTO products (id, establishment_id, name, price, active) VALUES (?,?,?,?,1)')
    .run(product.id, estId, product.name, product.price);

  const insertUser = db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)');
  insertUser.run(uuid(), estId, 'Admin', 'admin@ops.test', bcrypt.hashSync('Senha123', 10), 'admin');
  insertUser.run(uuid(), estId, 'Garçom', 'waiter@ops.test', bcrypt.hashSync('Senha123', 10), 'waiter');
  insertUser.run(uuid(), estId, 'Cozinha', 'kitchen@ops.test', bcrypt.hashSync('Senha123', 10), 'kitchen');
  insertUser.run(uuid(), otherEstId, 'Outro Admin', 'admin@other-ops.test', bcrypt.hashSync('Senha123', 10), 'admin');
  insertUser.run(uuid(), otherEstId, 'Outro Garçom', 'other-waiter@ops.test', bcrypt.hashSync('Senha123', 10), 'waiter');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('POST /api/tokens/sell', () => {
  it('usa preço do cardápio e ignora preço adulterado', async () => {
    const token = await login('waiter@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, name: product.name, price: 1, quantity: 2 }],
      payment_method: 'pix',
    }, token);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.codes).toHaveLength(2);
    expect(body.codes[0].price).toBe(product.price);
    expect(Number(body.total)).toBeCloseTo(product.price * 2, 2);
  });

  it('rejeita item fora do cardápio para waiter', async () => {
    const token = await login('waiter@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/sell', {
      items: [{ name: 'Item Falso', price: 5, quantity: 1 }],
    }, token);
    expect(res.status).toBe(400);
  });

  it('admin pode vender item fora do cardápio com preço manual', async () => {
    const token = await login('admin@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/sell', {
      items: [{ name: 'Taxa de Serviço', price: 12.5, quantity: 1 }],
    }, token);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.codes[0].price).toBe(12.5);
  });

  it('kitchen não pode vender fichas', async () => {
    const token = await login('kitchen@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, quantity: 1 }],
    }, token);
    expect(res.status).toBe(403);
  });

  it('não resolve produto de outro estabelecimento para waiter', async () => {
    const token = await login('other-waiter@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, name: product.name, price: product.price, quantity: 1 }],
    }, token);
    expect(res.status).toBe(400);
  });
});

describe('POST /api/tokens/validate', () => {
  it('valida uma vez e marca como usada na segunda', async () => {
    const waiterToken = await login('waiter@ops.test', 'Senha123');
    const sold = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, name: product.name, quantity: 1 }],
    }, waiterToken);
    expect(sold.status).toBe(201);
    const { codes } = await sold.json();
    const code = codes[0].code;

    const kitchenToken = await login('kitchen@ops.test', 'Senha123');
    const first = await (await req('POST', '/api/tokens/validate', { code }, kitchenToken)).json();
    expect(first.status).toBe('valid');

    const second = await (await req('POST', '/api/tokens/validate', { code }, kitchenToken)).json();
    expect(second.status).toBe('used');
  });

  it('código inexistente retorna invalid (sem erro HTTP)', async () => {
    const kitchenToken = await login('kitchen@ops.test', 'Senha123');
    const res = await req('POST', '/api/tokens/validate', { code: 'NAOEXISTE00000000' }, kitchenToken);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('invalid');
  });
});

describe('GET /api/tokens', () => {
  it('lista fichas apenas do próprio tenant', async () => {
    const adminToken = await login('admin@ops.test', 'Senha123');
    const res = await req('GET', '/api/tokens', undefined, adminToken);
    expect(res.status).toBe(200);
    const tokens = await res.json();

    const otherToken = db.prepare('SELECT establishment_id FROM bar_tokens LIMIT 1').get() as any;
    expect(otherToken).toBeDefined();
    expect(tokens.every((t: any) => t.establishment_id === estId)).toBe(true);
  });
});

describe('Cover charge', () => {
  it('admin atualiza config e waiter registra entrada com preço do config', async () => {
    const adminToken = await login('admin@ops.test', 'Senha123');
    const put = await req('PUT', '/api/cover/config', { price: 30, capacity: 100 }, adminToken);
    expect(put.status).toBe(200);

    const waiterToken = await login('waiter@ops.test', 'Senha123');
    const entry = await req('POST', '/api/cover/entry', {}, waiterToken);
    expect(entry.status).toBe(201);
    const entryBody = await entry.json();
    expect(Number(entryBody.amount)).toBe(30);
  });

  it('waiter não pode alterar a config', async () => {
    const waiterToken = await login('waiter@ops.test', 'Senha123');
    const res = await req('PUT', '/api/cover/config', { price: 1, capacity: 1 }, waiterToken);
    expect(res.status).toBe(403);
  });

  it('kitchen não pode registrar entrada', async () => {
    const kitchenToken = await login('kitchen@ops.test', 'Senha123');
    const res = await req('POST', '/api/cover/entry', {}, kitchenToken);
    expect(res.status).toBe(403);
  });

  it('count e transactions refletem a entrada', async () => {
    const adminToken = await login('admin@ops.test', 'Senha123');

    const count = await (await req('GET', '/api/cover/count', undefined, adminToken)).json();
    expect(count.current).toBeGreaterThanOrEqual(1);
    expect(count.capacity).toBe(100);

    const txns = await (await req('GET', '/api/cover/transactions', undefined, adminToken)).json();
    expect(txns.transactions.length).toBeGreaterThanOrEqual(1);
    expect(Number(txns.total_today)).toBeGreaterThanOrEqual(30);
  });

  it('config é isolada por tenant (outro estabelecimento usa padrão)', async () => {
    const otherToken = await login('admin@other-ops.test', 'Senha123');
    const config = await (await req('GET', '/api/cover/config', undefined, otherToken)).json();
    expect(Number(config.price)).toBe(25);
    expect(config.capacity).toBe(250);
  });
});

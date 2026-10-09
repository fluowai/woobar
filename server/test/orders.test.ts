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
const product = { id: uuid(), name: 'Hambúrguer Artesanal', price: 38.5 };
const waiterId = uuid();
const otherOrder = { id: uuid(), customer_name: 'Cliente do Bar Inimigo' };

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
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Orders', 'bar-orders');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Bar Outro', 'bar-outro-orders');
  db.prepare('INSERT INTO products (id, establishment_id, name, price, active) VALUES (?,?,?,?,1)')
    .run(product.id, estId, product.name, product.price);

  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(uuid(), estId, 'Admin', 'admin@orders.test', bcrypt.hashSync('Senha123', 10), 'admin');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(waiterId, estId, 'Garçom', 'waiter@orders.test', bcrypt.hashSync('Senha123', 10), 'waiter');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(uuid(), otherEstId, 'Outro Admin', 'admin@other.test', bcrypt.hashSync('Senha123', 10), 'admin');

  db.prepare(`INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status) VALUES (?,?,?,?,?,?)`)
    .run(otherOrder.id, otherEstId, otherOrder.customer_name, '[]', 10, 'pending');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('POST /api/orders', () => {
  it('calcula total no servidor ignorando preço adulterado', async () => {
    const token = await login('waiter@orders.test', 'Senha123');
    const res = await req('POST', '/api/orders', {
      customer_name: 'Ana',
      items: [{ product_id: product.id, name: product.name, price: 0.01, quantity: 2 }],
      payment_method: 'pix',
      channel: 'website',
    }, token);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Number(body.total)).toBeCloseTo(product.price * 2, 2);
    expect(body.status).toBe('pending');

    const saved = db.prepare('SELECT * FROM orders WHERE id = ?').get(body.id) as any;
    const savedItems = JSON.parse(saved.items_json);
    expect(savedItems[0].price).toBe(product.price);
  });

  it('rejeita pedido sem itens válidos', async () => {
    const token = await login('waiter@orders.test', 'Senha123');
    const res = await req('POST', '/api/orders', {
      customer_name: 'Ana',
      items: [{ product_id: uuid(), price: 5, quantity: 1 }],
    }, token);
    expect(res.status).toBe(400);
  });

  it('rejeita requisição sem autenticação', async () => {
    const res = await req('POST', '/api/orders', { customer_name: 'Ana', items: [] });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/orders e isolamento de tenant', () => {
  it('não retorna pedidos de outro estabelecimento', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const res = await req('GET', '/api/orders', undefined, token);
    expect(res.status).toBe(200);
    const orders = await res.json();
    expect(orders.some((o: any) => o.id === otherOrder.id)).toBe(false);
  });

  it('filtros por status funcionam', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const res = await req('GET', '/api/orders?status=cancelled', undefined, token);
    expect(res.status).toBe(200);
    const orders = await res.json();
    expect(orders.every((o: any) => o.status === 'cancelled')).toBe(true);
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('atualiza o status', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const created = await req('POST', '/api/orders', {
      customer_name: 'Carlos',
      items: [{ product_id: product.id, quantity: 1 }],
    }, token);
    const { id } = await created.json();

    const res = await req('PATCH', `/api/orders/${id}/status`, { status: 'preparing' }, token);
    expect(res.status).toBe(200);

    const saved = db.prepare('SELECT status FROM orders WHERE id = ?').get(id) as any;
    expect(saved.status).toBe('preparing');
  });

  it('rejeita status inválido', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const res = await req('PATCH', `/api/orders/${uuid()}/status`, { status: 'voando' }, token);
    expect(res.status).toBe(400);
  });

  it('404 para pedido inexistente', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const res = await req('PATCH', `/api/orders/${uuid()}/status`, { status: 'ready' }, token);
    expect(res.status).toBe(404);
  });
});

describe('POST /api/orders/:id/messages', () => {
  it('adiciona mensagem a pedido do mesmo tenant', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const created = await req('POST', '/api/orders', {
      customer_name: 'Mensagens',
      items: [{ product_id: product.id, quantity: 1 }],
    }, token);
    const { id } = await created.json();

    const res = await req('POST', `/api/orders/${id}/messages`, { text: 'Pedido a caminho!', sender: 'store' }, token);
    expect(res.status).toBe(201);

    const detail = await req('GET', `/api/orders/${id}`, undefined, token);
    const body = await detail.json();
    expect(body.messages.some((m: any) => m.text === 'Pedido a caminho!')).toBe(true);
  });

  it('rejeita mensagem vazia', async () => {
    const token = await login('admin@orders.test', 'Senha123');
    const res = await req('POST', `/api/orders/${uuid()}/messages`, { text: '   ' }, token);
    expect(res.status).toBe(400);
  });
});

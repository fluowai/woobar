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
const adminId = uuid();
const waiterId = uuid();
const orderId = uuid();

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
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Pagamento Teste', 'bar-pagamento-teste');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Outro Bar Pagamento', 'outro-bar-pagamento');

  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(adminId, estId, 'Admin Pay', 'admin@pay.test', bcrypt.hashSync('Senha123', 10), 'admin');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(waiterId, estId, 'Garcom Pay', 'waiter@pay.test', bcrypt.hashSync('Senha123', 10), 'waiter');

  db.prepare(`
    INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, payment_method, payment_status, channel)
    VALUES (?,?,?,?,?,?,?,?,?)
  `).run(orderId, estId, 'Cliente Teste PIX', '[]', 55.0, 'pending', 'counter', 'unpaid', 'kiosk');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('Módulo de Pagamentos Online & PIX Dinâmico (/api/payments)', () => {
  it('rejeita consulta de configurações sem token', async () => {
    const res = await req('GET', '/api/payments/settings');
    expect(res.status).toBe(401);
  });

  it('bloqueia garçom de alterar configurações de pagamento', async () => {
    const waiterToken = await login('waiter@pay.test', 'Senha123');
    const res = await req('PUT', '/api/payments/settings', { provider: 'mercadopago' }, waiterToken);
    expect(res.status).toBe(403);
  });

  it('permite admin salvar e consultar configurações de gateway (sem vazar access_token)', async () => {
    const adminToken = await login('admin@pay.test', 'Senha123');
    const saveRes = await req('PUT', '/api/payments/settings', {
      provider: 'mercadopago',
      access_token: 'APP_USR-1234567890-SECRET-TOKEN',
      public_key: 'APP_USR-PUBLIC-KEY',
      pix_key: 'financeiro@woobar.com',
      auto_approve_test: 0,
      active: 1,
    }, adminToken);

    expect(saveRes.status).toBe(200);
    const saveData = await saveRes.json();
    expect(saveData.success).toBe(true);

    const getRes = await req('GET', '/api/payments/settings', undefined, adminToken);
    expect(getRes.status).toBe(200);
    const settings = await getRes.json();
    expect(settings.provider).toBe('mercadopago');
    expect(settings.public_key).toBe('APP_USR-PUBLIC-KEY');
    expect(settings.has_credentials).toBe(true);
    expect(settings.access_token).toBe('***');
  });

  it('cria cobrança PIX pública com QR Code e Copia e Cola para um pedido', async () => {
    const res = await req('POST', `/api/payments/public/pix/order/${orderId}`, {
      payer_name: 'Cliente Teste PIX',
      payer_email: 'cliente@teste.com',
      payer_cpf: '12345678909',
    });

    expect(res.status).toBe(201);
    const payment = await res.json();
    expect(payment.id).toBeDefined();
    expect(payment.status).toBe('pending');
    expect(payment.amount).toBe(55.0);
    expect(payment.method).toBe('pix');
    expect(payment.qr_code).toBeDefined();
    expect(payment.qr_code.length).toBeGreaterThan(20);
    expect(payment.qr_code_base64).toBeDefined();

    // Consulta status público do pagamento
    const statusRes = await req('GET', `/api/payments/public/status/${payment.id}`);
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.status).toBe('pending');
    expect(statusData.amount).toBe(55.0);
  });

  it('simula aprovação de pagamento e atualiza status do pedido para preparando e pago', async () => {
    const adminToken = await login('admin@pay.test', 'Senha123');

    // Cria outro pedido para simulação
    const newOrderId = uuid();
    db.prepare(`
      INSERT INTO orders (id, establishment_id, customer_name, items_json, total, status, payment_method, payment_status, channel)
      VALUES (?,?,?,?,?,?,?,?,?)
    `).run(newOrderId, estId, 'Cliente Simulação', '[]', 32.5, 'pending', 'counter', 'unpaid', 'kiosk');

    const createRes = await req('POST', `/api/payments/public/pix/order/${newOrderId}`);
    expect(createRes.status).toBe(201);
    const payment = await createRes.json();

    // Simula confirmação de pagamento
    const approveRes = await req('POST', `/api/payments/simulate-approval/${payment.id}`, {}, adminToken);
    expect(approveRes.status).toBe(200);
    const approveData = await approveRes.json();
    expect(approveData.success).toBe(true);
    expect(approveData.payment.status).toBe('approved');

    // Verifica que o pedido foi atualizado no banco
    const orderInDb = db.prepare('SELECT status, payment_status, payment_method FROM orders WHERE id = ?').get(newOrderId) as any;
    expect(orderInDb.payment_status).toBe('paid');
    expect(orderInDb.payment_method).toBe('pix');
    expect(orderInDb.status).toBe('preparing');
  });

  it('recebe webhook do Mercado Pago com sucesso (status 200)', async () => {
    const res = await req('POST', '/api/payments/webhook/mercadopago', {
      action: 'payment.updated',
      type: 'payment',
      data: { id: '9999999999' },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });
});

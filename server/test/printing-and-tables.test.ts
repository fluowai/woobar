import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import db from '../src/db/schema.js';
import { buildReceipt } from '../src/services/printing/escpos.js';

let server: http.Server;
let base: string;

const estId = uuid();
const otherEstId = uuid();
const product = { id: uuid(), name: 'Chopp Pilsen 500ml', price: 15.0 };

const req = (method: string, path: string, body?: any, token?: string, headers?: Record<string, string>) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
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
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Teste Impressao', 'bar-teste-print');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Bar Teste 2', 'bar-teste-2');
  db.prepare('INSERT INTO products (id, establishment_id, name, price, active) VALUES (?,?,?,?,1)')
    .run(product.id, estId, product.name, product.price);

  const insertUser = db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)');
  insertUser.run(uuid(), estId, 'Admin Print', 'admin@print.test', bcrypt.hashSync('Senha123', 10), 'admin');
  insertUser.run(uuid(), estId, 'Waiter Print', 'waiter@print.test', bcrypt.hashSync('Senha123', 10), 'waiter');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('ESC/POS Receipt generation', () => {
  it('gera buffer ESC/POS formatado com divisores, dados e corte de papel', () => {
    const doc = {
      establishment: 'Woobar Central',
      title: 'FICHA DE CONSUMO',
      subtitle: 'Chopp Artesanal',
      code: 'ABCDEF1234567890',
      qrValue: 'ABCDEF1234567890',
      lines: [
        { label: 'Valor', value: 'R$ 15.00' },
        { label: 'Pagamento', value: 'PIX' },
      ],
      footer: 'Entregue no balcao para consumo',
    };

    const buffer80 = buildReceipt(doc, 80);
    expect(buffer80).toBeInstanceOf(Buffer);
    expect(buffer80.length).toBeGreaterThan(50);
    const textContent = buffer80.toString('utf8');
    expect(textContent).toContain('Woobar Central');
    expect(textContent).toContain('FICHA DE CONSUMO');
    expect(textContent).toContain('Chopp Artesanal');
    expect(textContent).toContain('ABCDEF1234567890');
    expect(textContent).toContain('Valor: R$ 15.00');

    // 58mm
    const buffer58 = buildReceipt(doc, 58);
    expect(buffer58).toBeInstanceOf(Buffer);
    expect(buffer58.length).toBeGreaterThan(50);
  });
});

describe('Sistema de Impressão e Agente Local', () => {
  let adminToken: string;
  let waiterToken: string;
  let agentSecretToken: string;

  beforeAll(async () => {
    adminToken = await login('admin@print.test', 'Senha123');
    waiterToken = await login('waiter@print.test', 'Senha123');
  });

  it('admin configura impressora para modo agente com auto_print de fichas ativo', async () => {
    const res = await req('PUT', '/api/printing/config', {
      name: 'Impressora Balcão',
      delivery_mode: 'agent',
      paper_width: 80,
      auto_print_tokens: true,
      auto_print_tickets: true,
      enabled: true,
    }, adminToken);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    const getRes = await req('GET', '/api/printing', undefined, adminToken);
    expect(getRes.status).toBe(200);
    const data = await getRes.json();
    expect(data.config.name).toBe('Impressora Balcão');
    expect(data.config.delivery_mode).toBe('agent');
    expect(data.config.enabled).toBe(1);
    expect(data.config.auto_print_tokens).toBe(1);
  });

  it('pareia um novo agente de impressão gerando token criptografado', async () => {
    const res = await req('POST', '/api/printing/agent/pair', { name: 'PC Caixa 1' }, adminToken);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBeDefined();
    expect(body.token.length).toBe(64); // 32 bytes hex
    agentSecretToken = body.token;
  });

  it('venda de ficha com auto_print_tokens gera fila de impressão pendente', async () => {
    const sellRes = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, name: product.name, quantity: 1 }],
      payment_method: 'pix',
    }, waiterToken);

    expect(sellRes.status).toBe(201);
    const sellBody = await sellRes.json();
    expect(sellBody.codes).toHaveLength(1);
    expect(sellBody.print_jobs).toHaveLength(1);
    expect(sellBody.print_jobs[0].status).toBe('pending');
    const jobId = sellBody.print_jobs[0].id;

    // Agente busca o próximo trabalho da fila
    const agentNextRes = await req('GET', '/api/printing/agent/next', undefined, undefined, {
      'x-print-agent-token': agentSecretToken,
    });
    expect(agentNextRes.status).toBe(200);
    const agentData = await agentNextRes.json();
    expect(agentData.job).toBeDefined();
    expect(agentData.job.id).toBe(jobId);
    expect(agentData.job.status).toBe('printing');
    expect(agentData.job.payload.title).toBe('FICHA DE CONSUMO');
    expect(agentData.job.payload.code).toBe(sellBody.codes[0].code);

    // Agente confirma impressão bem-sucedida
    const completeRes = await req('POST', `/api/printing/agent/jobs/${jobId}/complete`, { success: true }, undefined, {
      'x-print-agent-token': agentSecretToken,
    });
    expect(completeRes.status).toBe(200);
    expect((await completeRes.json()).success).toBe(true);

    // Consulta fila no painel e confirma status 'printed'
    const queueRes = await req('GET', '/api/printing', undefined, adminToken);
    const queueData = await queueRes.json();
    const updatedJob = queueData.jobs.find((j: any) => j.id === jobId);
    expect(updatedJob).toBeDefined();
    expect(updatedJob.status).toBe('printed');
  });

  it('reimprime ficha manualmente pelo código (POST /api/printing/token/:code)', async () => {
    // Vende uma ficha
    const sellRes = await req('POST', '/api/tokens/sell', {
      items: [{ product_id: product.id, name: product.name, quantity: 1 }],
      payment_method: 'dinheiro',
    }, waiterToken);
    const { codes } = await sellRes.json();
    const tokenCode = codes[0].code;

    // Dispara reimpressão
    const reprintRes = await req('POST', `/api/printing/token/${tokenCode}`, {}, adminToken);
    expect(reprintRes.status).toBe(200);
    const reprintBody = await reprintRes.json();
    expect(reprintBody.status).toBe('pending');

    // Agente captura o job
    const agentRes = await req('GET', '/api/printing/agent/next', undefined, undefined, {
      'x-print-agent-token': agentSecretToken,
    });
    const { job } = await agentRes.json();
    expect(job).toBeDefined();
    expect(job.payload.code).toBe(tokenCode);

    // Agente simula erro de papel e envia falha
    await req('POST', `/api/printing/agent/jobs/${job.id}/complete`, { success: false, error: 'Sem papel' }, undefined, {
      'x-print-agent-token': agentSecretToken,
    });

    // Admin tenta retry do job
    const retryRes = await req('POST', `/api/printing/jobs/${job.id}/retry`, {}, adminToken);
    expect(retryRes.status).toBe(200);
    const retryBody = await retryRes.json();
    expect(retryBody.status).toBe('pending');
  });

  it('rejeita agente sem token ou com token inválido', async () => {
    const noToken = await req('GET', '/api/printing/agent/next');
    expect(noToken.status).toBe(401);

    const badToken = await req('GET', '/api/printing/agent/next', undefined, undefined, {
      'x-print-agent-token': 'token-invalido-12345678901234567890123456789012',
    });
    expect(badToken.status).toBe(401);
  });
});

describe('Fluxo Completo de Mesas e Comandas (Table Orders)', () => {
  let adminToken: string;
  let waiterToken: string;
  let tableId: string;
  let orderId: string;
  let itemId: string;

  beforeAll(async () => {
    adminToken = await login('admin@print.test', 'Senha123');
    waiterToken = await login('waiter@print.test', 'Senha123');

    tableId = uuid();
    db.prepare('INSERT INTO tables (id, establishment_id, name, status, seats) VALUES (?,?,?,?,?)')
      .run(tableId, estId, 'Mesa 10', 'free', 4);
  });

  it('garçom abre comanda para uma mesa livre', async () => {
    const res = await req('POST', '/api/tables/orders', {
      table_id: tableId,
      customer_name: 'Cliente VIP',
    }, waiterToken);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toBeDefined();
    orderId = body.id;

    // Mesa deve ficar occupied
    const tablesRes = await req('GET', '/api/tables', undefined, waiterToken);
    const tables = await tablesRes.json();
    const table = tables.find((t: any) => t.id === tableId);
    expect(table.status).toBe('occupied');
  });

  it('recusa abrir segunda comanda simultânea para a mesma mesa', async () => {
    const res = await req('POST', '/api/tables/orders', {
      table_id: tableId,
      customer_name: 'Outro Cliente',
    }, waiterToken);
    expect(res.status).toBe(409);
  });

  it('adiciona itens à comanda com cálculo de preço server-side', async () => {
    const res = await req('POST', `/api/tables/orders/${orderId}/items`, {
      product_id: product.id,
      quantity: 3,
      price: 1.0, // Preço adulterado ignorado
      notes: 'Bem gelado',
    }, waiterToken);

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.price).toBe(product.price);
    itemId = body.id;

    // Verifica comanda atualizada
    const orderRes = await req('GET', `/api/tables/orders/${orderId}`, undefined, waiterToken);
    const order = await orderRes.json();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].product_name).toBe(product.name);
    expect(Number(order.total)).toBeCloseTo(product.price * 3, 2);
  });

  it('atualiza status do item de pending -> preparing -> ready', async () => {
    const p1 = await req('PATCH', `/api/tables/orders/items/${itemId}/status`, { status: 'preparing' }, waiterToken);
    expect(p1.status).toBe(200);

    const p2 = await req('PATCH', `/api/tables/orders/items/${itemId}/status`, { status: 'ready' }, waiterToken);
    expect(p2.status).toBe(200);

    const orderRes = await req('GET', `/api/tables/orders/${orderId}`, undefined, waiterToken);
    const order = await orderRes.json();
    expect(order.items[0].status).toBe('ready');
  });

  it('fecha a comanda com pagamento e marca mesa como dirty para limpeza', async () => {
    // Testa impressão da comanda de mesa antes do fechamento
    const printTableRes = await req('POST', `/api/printing/table-order/${orderId}`, {}, waiterToken);
    expect(printTableRes.status).toBe(200);
    const printTableBody = await printTableRes.json();
    expect(printTableBody.status).toBeDefined();

    // Fecha a comanda
    const closeRes = await req('POST', `/api/tables/orders/${orderId}/close`, {
      payment_method: 'pix',
    }, waiterToken);

    expect(closeRes.status).toBe(200);

    // Comanda não deve mais estar em abertas
    const openRes = await req('GET', '/api/tables/orders', undefined, waiterToken);
    const openOrders = await openRes.json();
    expect(openOrders.find((o: any) => o.id === orderId)).toBeUndefined();

    // Mesa deve estar dirty
    const tablesRes = await req('GET', '/api/tables', undefined, waiterToken);
    const tables = await tablesRes.json();
    const table = tables.find((t: any) => t.id === tableId);
    expect(table.status).toBe('dirty');

    // Libera mesa para novo uso
    const cleanRes = await req('PATCH', `/api/tables/${tableId}/status`, { status: 'free' }, waiterToken);
    expect(cleanRes.status).toBe(200);
  });

  it('cria pedido de delivery e envia comprovante para impressão', async () => {
    const createRes = await req('POST', '/api/orders', {
      customer_name: 'Cliente Delivery Teste',
      customer_phone: '11999999999',
      customer_address: 'Rua das Flores, 123',
      payment_method: 'pix',
      items: [{ product_id: product.id, quantity: 2 }],
    }, waiterToken);
    expect(createRes.status).toBe(201);
    const orderData = await createRes.json();
    expect(orderData.id).toBeDefined();

    const printRes = await req('POST', `/api/printing/order/${orderData.id}`, {}, waiterToken);
    expect(printRes.status).toBe(200);
    const printBody = await printRes.json();
    expect(printBody.id).toBeDefined();
    expect(['pending', 'printed']).toContain(printBody.status);
  });
});

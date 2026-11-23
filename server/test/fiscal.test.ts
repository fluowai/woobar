import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import app from '../src/app.js';
import db from '../src/db/schema.js';
import { buildDanfeDocument, buildDanfeEscpos, formatChaveAcesso } from '../src/services/fiscal.js';

let server: http.Server;
let base: string;

const estId = uuid();
const otherEstId = uuid();
const adminId = uuid();
const waiterId = uuid();

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
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Fiscal Teste', 'bar-fiscal-teste');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Bar Outro Fiscal', 'bar-outro-fiscal');

  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(adminId, estId, 'Admin Fiscal', 'admin@fiscal.test', bcrypt.hashSync('Senha123', 10), 'admin');
  db.prepare('INSERT INTO users (id, establishment_id, name, email, password_hash, role) VALUES (?,?,?,?,?,?)')
    .run(waiterId, estId, 'Garçom Fiscal', 'waiter@fiscal.test', bcrypt.hashSync('Senha123', 10), 'waiter');

  server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  base = `http://127.0.0.1:${port}`;
});

afterAll(() => new Promise<void>(resolve => {
  server.close(() => resolve());
}));

describe('Módulo Fiscal NFC-e (/api/fiscal)', () => {
  it('rejeita acesso a /api/fiscal/settings sem autenticação', async () => {
    const res = await req('GET', '/api/fiscal/settings');
    expect(res.status).toBe(401);
  });

  it('bloqueia garçom de acessar configurações fiscais', async () => {
    const waiterToken = await login('waiter@fiscal.test', 'Senha123');
    const res = await req('GET', '/api/fiscal/settings', undefined, waiterToken);
    expect(res.status).toBe(403);
  });

  it('permite admin consultar e salvar configurações fiscais', async () => {
    const adminToken = await login('admin@fiscal.test', 'Senha123');

    // Inicialmente vazio
    const getRes1 = await req('GET', '/api/fiscal/settings', undefined, adminToken);
    expect(getRes1.status).toBe(200);

    // Salva configurações
    const savePayload = {
      environment: 2,
      company_name: 'BAR TESTE LTDA',
      fantasy_name: 'WOOBAR TESTE',
      cnpj: '12.345.678/0001-90',
      ie: '123456789',
      crt: 1,
      uf: 'SP',
      ibge_code: 3550308,
      city: 'São Paulo',
      street: 'Av Paulista',
      number: '1000',
      neighborhood: 'Bela Vista',
      zip_code: '01310-100',
      csc: 'TOKEN_CSC_HOMOLOGACAO',
      csc_id: '000001',
      cert_pfx_base64: 'MII...MOCK_CERTIFICADO...',
      cert_password: 'senha_secreta_a1',
      serie: 1,
    };

    const putRes = await req('PUT', '/api/fiscal/settings', savePayload, adminToken);
    expect(putRes.status).toBe(200);
    const putData = await putRes.json();
    expect(putData.success).toBe(true);

    // Consulta e confirma que senha e base64 não são expostos
    const getRes2 = await req('GET', '/api/fiscal/settings', undefined, adminToken);
    expect(getRes2.status).toBe(200);
    const settings = await getRes2.json();
    expect(settings.company_name).toBe('BAR TESTE LTDA');
    expect(settings.cnpj).toBe('12345678000190');
    expect(settings.has_certificate).toBe(true);
    expect(settings.cert_password).toBe('***');
    expect(settings.cert_pfx_base64).toBe('***');
  });

  it('valida campos obrigatórios ao atualizar configurações fiscais', async () => {
    const adminToken = await login('admin@fiscal.test', 'Senha123');
    const invalidPayload = {
      company_name: 'X', // Muito curto
      cnpj: '123', // Inválido
    };
    const res = await req('PUT', '/api/fiscal/settings', invalidPayload, adminToken);
    expect(res.status).toBe(400);
  });

  it('rejeita emissão de pedido inexistente ou de outro estabelecimento', async () => {
    const adminToken = await login('admin@fiscal.test', 'Senha123');
    const res = await req('POST', `/api/fiscal/emit-order/${uuid()}`, {}, adminToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('não encontrado');
  });

  it('formata chave de acesso e monta documento DANFE NFC-e com QR Code', () => {
    const chave = '35261012345678000190650010000001231000001234';
    const formatted = formatChaveAcesso(chave);
    expect(formatted).toBe('3526 1012 3456 7800 0190 6500 1000 0001 2310 0000 1234');

    const mockInvoice: any = {
      id: uuid(),
      establishment_id: estId,
      serie: 1,
      number: 123,
      status: 'autorizada',
      ch_nfe: chave,
      protocol: '135260000000001',
      total: 45.0,
      environment: 2,
      qrcode_url: 'https://www.sefaz.sp.gov.br/nfce/qrcode?p=35261012345678000190650010000001231000001234|2|2|1|token',
      items_json: JSON.stringify([
        { descricao: 'Chopp Pilsen 500ml', quantidade: 2, valor_unitario: 15.0, valor_total: 30.0, unidade: 'UN' },
        { descricao: 'Porção Batata Frita', quantidade: 1, valor_unitario: 15.0, valor_total: 15.0, unidade: 'UN' },
      ]),
      payments_json: JSON.stringify([{ forma: '17', valor: 45.0 }]),
      customer_cpf: '12345678900',
    };

    const doc = buildDanfeDocument(mockInvoice, 'Bar Fiscal Teste');
    expect(doc.establishment).toBe('Bar Fiscal Teste');
    expect(doc.title).toBe('COMPROVANTE FISCAL');
    expect(doc.qrValue).toContain('https://www.sefaz.sp.gov.br/nfce/qrcode');
    expect(doc.lines?.some(l => l.label.includes('HOMOLOGAÇÃO'))).toBe(true);
    expect(doc.lines?.some(l => l.value?.includes('R$ 45.00'))).toBe(true);

    const escposBuffer = buildDanfeEscpos(mockInvoice, 'Bar Fiscal Teste');
    expect(escposBuffer.length).toBeGreaterThan(100);
  });
});

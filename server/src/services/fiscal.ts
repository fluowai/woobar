import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { logger } from '../lib/logger.js';
import { buildReceipt } from './printing/escpos.js';

const FISCAL_URL = process.env.FISCAL_URL || 'http://fiscal:8080';
const FISCAL_TOKEN = process.env.FISCAL_TOKEN || '';

export interface FiscalSettings {
  establishment_id: string;
  environment: 1 | 2;
  company_name: string;
  fantasy_name?: string;
  cnpj: string;
  ie: string;
  crt: number;
  uf: string;
  ibge_code: number;
  city: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  zip_code: string;
  phone?: string;
  csc: string;
  csc_id: string;
  cert_pfx_base64?: string;
  cert_password?: string;
  serie: number;
  last_number: number;
  auto_emit_on_closing: number;
  updated_at?: string;
}

export interface FiscalInvoice {
  id: string;
  establishment_id: string;
  order_id?: string;
  table_order_id?: string;
  serie: number;
  number: number;
  status: 'autorizada' | 'cancelada' | 'rejeitada' | 'denegada' | 'erro';
  ch_nfe?: string;
  protocol?: string;
  xml?: string;
  qrcode_url?: string;
  c_stat?: string;
  motivo?: string;
  total: number;
  items_json: string;
  payments_json: string;
  customer_cpf?: string;
  customer_name?: string;
  environment: number;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at?: string;
}

export function getFiscalSettings(establishmentId: string): FiscalSettings | null {
  const row = db.prepare('SELECT * FROM fiscal_settings WHERE establishment_id = ?').get(establishmentId) as any;
  if (!row) return null;
  return {
    ...row,
    environment: (row.environment || 2) as 1 | 2,
    has_certificate: !!row.cert_pfx_base64,
    // Nunca expõe o base64 integral e senha na leitura pública
    cert_pfx_base64: row.cert_pfx_base64 ? '***' : undefined,
    cert_password: row.cert_password ? '***' : undefined,
  };
}

export function getRawFiscalSettings(establishmentId: string): any {
  return db.prepare('SELECT * FROM fiscal_settings WHERE establishment_id = ?').get(establishmentId);
}

export function saveFiscalSettings(establishmentId: string, data: any) {
  const existing = db.prepare('SELECT * FROM fiscal_settings WHERE establishment_id = ?').get(establishmentId) as any;
  const merged = { ...existing, ...data };

  // Se não foi enviado um novo certificado, mantém o existente
  const pfx = (data.cert_pfx_base64 && data.cert_pfx_base64 !== '***')
    ? data.cert_pfx_base64
    : existing?.cert_pfx_base64 || '';
  const password = (data.cert_password && data.cert_password !== '***')
    ? data.cert_password
    : existing?.cert_password || '';

  db.prepare(`
    INSERT INTO fiscal_settings (
      establishment_id, environment, company_name, fantasy_name, cnpj, ie, crt,
      uf, ibge_code, city, street, number, complement, neighborhood, zip_code, phone,
      csc, csc_id, cert_pfx_base64, cert_password, serie, auto_emit_on_closing, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(establishment_id) DO UPDATE SET
      environment=excluded.environment, company_name=excluded.company_name, fantasy_name=excluded.fantasy_name,
      cnpj=excluded.cnpj, ie=excluded.ie, crt=excluded.crt, uf=excluded.uf, ibge_code=excluded.ibge_code,
      city=excluded.city, street=excluded.street, number=excluded.number, complement=excluded.complement,
      neighborhood=excluded.neighborhood, zip_code=excluded.zip_code, phone=excluded.phone,
      csc=excluded.csc, csc_id=excluded.csc_id, cert_pfx_base64=excluded.cert_pfx_base64,
      cert_password=excluded.cert_password, serie=excluded.serie, auto_emit_on_closing=excluded.auto_emit_on_closing,
      updated_at=datetime('now')
  `).run(
    establishmentId,
    merged.environment ?? 2,
    merged.company_name || '',
    merged.fantasy_name || '',
    (merged.cnpj || '').replace(/\D/g, ''),
    (merged.ie || '').replace(/\D/g, ''),
    merged.crt ?? 1,
    (merged.uf || 'SP').toUpperCase(),
    merged.ibge_code ?? 3550308,
    merged.city || 'São Paulo',
    merged.street || '',
    merged.number || '',
    merged.complement || '',
    merged.neighborhood || '',
    (merged.zip_code || '').replace(/\D/g, ''),
    merged.phone || '',
    merged.csc || '',
    merged.csc_id || '',
    pfx,
    password,
    merged.serie ?? 1,
    merged.auto_emit_on_closing ? 1 : 0
  );

  return getFiscalSettings(establishmentId);
}

async function callFiscalSidecar(endpoint: string, payload: any): Promise<any> {
  const url = `${FISCAL_URL.replace(/\/$/, '')}${endpoint}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Fiscal-Token': FISCAL_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const errorMsg = data?.motivo || data?.error || `Erro HTTP ${res.status} no sidecar fiscal`;
      throw new Error(errorMsg);
    }
    return data;
  } catch (err: any) {
    if (err.cause?.code === 'ECONNREFUSED' || err.message?.includes('fetch failed')) {
      logger.warn('Sidecar fiscal offline ou inacessível', { url });
      throw new Error('Serviço fiscal (sidecar PHP) não está acessível no endereço ' + url);
    }
    throw err;
  }
}

export async function checkFiscalStatus(establishmentId: string) {
  const settings = getRawFiscalSettings(establishmentId);
  if (!settings || !settings.cnpj || !settings.cert_pfx_base64) {
    return {
      status: 'unconfigured',
      motivo: 'Certificado digital ou dados da empresa não configurados',
      configured: false,
    };
  }

  const payload = {
    empresa: {
      razaosocial: settings.company_name,
      cnpj: settings.cnpj,
      siglaUF: settings.uf,
      ambiente: settings.environment,
    },
    certificado: {
      pfx_base64: settings.cert_pfx_base64,
      senha: settings.cert_password,
    },
  };

  const result = await callFiscalSidecar('/status', payload);
  return { ...result, configured: true, ambiente: settings.environment };
}

function mapPaymentToSefaz(method?: string): string {
  const m = (method || '').toLowerCase();
  if (m === 'money' || m === 'dinheiro') return '01';
  if (m === 'credit' || m === 'credito' || m === 'cartao_credito' || m === 'card') return '03';
  if (m === 'debit' || m === 'debito' || m === 'cartao_debito') return '04';
  if (m === 'pix') return '17';
  if (m === 'ticket' || m === 'refeicao' || m === 'vale_refeicao') return '11';
  if (m === 'alimentacao' || m === 'vale_alimentacao') return '10';
  return '99';
}

export async function emitNfceForOrder(
  establishmentId: string,
  orderId: string,
  customer?: { cpf?: string; name?: string }
): Promise<FiscalInvoice> {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND establishment_id = ?').get(orderId, establishmentId) as any;
  if (!order) throw new Error('Pedido não encontrado');

  const settings = getRawFiscalSettings(establishmentId);
  if (!settings || !settings.cert_pfx_base64) {
    throw new Error('Configurações fiscais ou certificado digital não cadastrados');
  }

  let items: any[] = [];
  try {
    items = typeof order.items_json === 'string' ? JSON.parse(order.items_json) : (order.items_json || []);
  } catch {
    items = [];
  }

  if (items.length === 0) {
    throw new Error('O pedido não possui itens para emissão fiscal');
  }

  // Busca detalhes fiscais dos produtos no banco
  const fiscalItems = items.map((it, idx) => {
    let p: any = null;
    if (it.product_id) {
      p = db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id);
    }
    const qtd = Number(it.quantity || 1);
    const vUnit = Number(it.price || it.unit_price || (order.total / items.length));
    const vTotal = Number(it.total || (qtd * vUnit));

    return {
      item: idx + 1,
      cProd: it.product_id || String(idx + 1),
      cEAN: 'SEM GTIN',
      descricao: it.name || it.product_name || 'PRODUTO',
      ncm: (p?.ncm || '22030000').replace(/\D/g, ''),
      cfop: (p?.cfop || '5102').replace(/\D/g, ''),
      unidade: p?.unit || 'UN',
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: vTotal,
      origem: p?.origin ?? 0,
      csosn: p?.csosn || '102',
    };
  });

  const totalCalculado = fiscalItems.reduce((acc, it) => acc + it.valor_total, 0);
  const total = Number(order.total) || totalCalculado;

  const pagamentos = [
    {
      forma: mapPaymentToSefaz(order.payment_method),
      valor: total,
    },
  ];

  // Reserva o próximo número de nota dentro de transação
  const invoiceNumber = db.transaction(() => {
    db.prepare('UPDATE fiscal_settings SET last_number = last_number + 1 WHERE establishment_id = ?').run(establishmentId);
    const updated = db.prepare('SELECT last_number, serie FROM fiscal_settings WHERE establishment_id = ?').get(establishmentId) as any;
    return { number: updated.last_number, serie: updated.serie || 1 };
  })();

  const destinatario: any = {};
  const cpfLimpo = (customer?.cpf || '').replace(/\D/g, '');
  if (cpfLimpo) {
    destinatario.cpf = cpfLimpo;
    destinatario.nome = customer?.name || order.customer_name || 'CONSUMIDOR';
  }

  const payload = {
    empresa: {
      razaosocial: settings.company_name,
      fantasia: settings.fantasy_name || settings.company_name,
      cnpj: settings.cnpj,
      ie: settings.ie,
      crt: settings.crt || 1,
      siglaUF: settings.uf,
      ambiente: settings.environment || 2,
      csc: settings.csc,
      cscid: settings.csc_id,
      endereco: {
        xLgr: settings.street,
        nro: settings.number,
        xCpl: settings.complement || null,
        xBairro: settings.neighborhood,
        cMun: settings.ibge_code,
        xMun: settings.city,
        UF: settings.uf,
        CEP: settings.zip_code,
        fone: settings.phone || null,
      },
    },
    certificado: {
      pfx_base64: settings.cert_pfx_base64,
      senha: settings.cert_password,
    },
    nota: {
      serie: invoiceNumber.serie,
      numero: invoiceNumber.number,
      natOp: 'VENDA AO CONSUMIDOR',
      itens: fiscalItems,
      pagamentos,
      destinatario,
    },
  };

  const invoiceId = uuid();
  let sidecarResult: any;

  try {
    sidecarResult = await callFiscalSidecar('/nfce/emitir', payload);
  } catch (err: any) {
    // Registra falha de comunicação
    db.prepare(`
      INSERT INTO fiscal_invoices (
        id, establishment_id, order_id, serie, number, status,
        total, items_json, payments_json, customer_cpf, customer_name,
        environment, c_stat, motivo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      invoiceId, establishmentId, orderId, invoiceNumber.serie, invoiceNumber.number, 'erro',
      total, JSON.stringify(fiscalItems), JSON.stringify(pagamentos),
      destinatario.cpf || null, destinatario.nome || null,
      settings.environment, '0', err.message
    );
    throw err;
  }

  const status = sidecarResult.status || 'erro';
  db.prepare(`
    INSERT INTO fiscal_invoices (
      id, establishment_id, order_id, serie, number, status,
      ch_nfe, protocol, xml, qrcode_url, c_stat, motivo,
      total, items_json, payments_json, customer_cpf, customer_name,
      environment
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    invoiceId, establishmentId, orderId, invoiceNumber.serie, invoiceNumber.number, status,
    sidecarResult.chave || null, sidecarResult.protocolo || null,
    sidecarResult.xml || null, sidecarResult.qrcode || null,
    sidecarResult.codigo || null, sidecarResult.motivo || null,
    total, JSON.stringify(fiscalItems), JSON.stringify(pagamentos),
    destinatario.cpf || null, destinatario.nome || null,
    settings.environment
  );

  return db.prepare('SELECT * FROM fiscal_invoices WHERE id = ?').get(invoiceId) as FiscalInvoice;
}

export async function emitNfceForTableOrder(
  establishmentId: string,
  tableOrderId: string,
  customer?: { cpf?: string; name?: string }
): Promise<FiscalInvoice> {
  const tableOrder = db.prepare('SELECT * FROM table_orders WHERE id = ? AND establishment_id = ?').get(tableOrderId, establishmentId) as any;
  if (!tableOrder) throw new Error('Comanda de mesa não encontrada');

  const items = db.prepare(`
    SELECT oi.*, p.ncm, p.cfop, p.csosn, p.origin, p.unit
    FROM table_order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.table_order_id = ? AND oi.status != 'cancelled'
  `).all(tableOrderId) as any[];

  if (items.length === 0) {
    throw new Error('A comanda não possui itens para emissão fiscal');
  }

  const settings = getRawFiscalSettings(establishmentId);
  if (!settings || !settings.cert_pfx_base64) {
    throw new Error('Configurações fiscais ou certificado digital não cadastrados');
  }

  const fiscalItems = items.map((it, idx) => {
    const qtd = Number(it.quantity || 1);
    const vUnit = Number(it.price || 0);
    const vTotal = qtd * vUnit;

    return {
      item: idx + 1,
      cProd: it.product_id || String(idx + 1),
      cEAN: 'SEM GTIN',
      descricao: it.product_name || 'CONSUMO',
      ncm: (it.ncm || '22030000').replace(/\D/g, ''),
      cfop: (it.cfop || '5102').replace(/\D/g, ''),
      unidade: it.unit || 'UN',
      quantidade: qtd,
      valor_unitario: vUnit,
      valor_total: vTotal,
      origem: it.origin ?? 0,
      csosn: it.csosn || '102',
    };
  });

  const totalCalculado = fiscalItems.reduce((acc, it) => acc + it.valor_total, 0);
  const total = Number(tableOrder.total) || totalCalculado;

  const pagamentos = [
    {
      forma: mapPaymentToSefaz(tableOrder.payment_method),
      valor: total,
    },
  ];

  const invoiceNumber = db.transaction(() => {
    db.prepare('UPDATE fiscal_settings SET last_number = last_number + 1 WHERE establishment_id = ?').run(establishmentId);
    const updated = db.prepare('SELECT last_number, serie FROM fiscal_settings WHERE establishment_id = ?').get(establishmentId) as any;
    return { number: updated.last_number, serie: updated.serie || 1 };
  })();

  const destinatario: any = {};
  const cpfLimpo = (customer?.cpf || '').replace(/\D/g, '');
  if (cpfLimpo) {
    destinatario.cpf = cpfLimpo;
    destinatario.nome = customer?.name || tableOrder.customer_name || 'CONSUMIDOR';
  }

  const payload = {
    empresa: {
      razaosocial: settings.company_name,
      fantasia: settings.fantasy_name || settings.company_name,
      cnpj: settings.cnpj,
      ie: settings.ie,
      crt: settings.crt || 1,
      siglaUF: settings.uf,
      ambiente: settings.environment || 2,
      csc: settings.csc,
      cscid: settings.csc_id,
      endereco: {
        xLgr: settings.street,
        nro: settings.number,
        xCpl: settings.complement || null,
        xBairro: settings.neighborhood,
        cMun: settings.ibge_code,
        xMun: settings.city,
        UF: settings.uf,
        CEP: settings.zip_code,
        fone: settings.phone || null,
      },
    },
    certificado: {
      pfx_base64: settings.cert_pfx_base64,
      senha: settings.cert_password,
    },
    nota: {
      serie: invoiceNumber.serie,
      numero: invoiceNumber.number,
      natOp: 'VENDA AO CONSUMIDOR',
      itens: fiscalItems,
      pagamentos,
      destinatario,
    },
  };

  const invoiceId = uuid();
  let sidecarResult: any;

  try {
    sidecarResult = await callFiscalSidecar('/nfce/emitir', payload);
  } catch (err: any) {
    db.prepare(`
      INSERT INTO fiscal_invoices (
        id, establishment_id, table_order_id, serie, number, status,
        total, items_json, payments_json, customer_cpf, customer_name,
        environment, c_stat, motivo
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      invoiceId, establishmentId, tableOrderId, invoiceNumber.serie, invoiceNumber.number, 'erro',
      total, JSON.stringify(fiscalItems), JSON.stringify(pagamentos),
      destinatario.cpf || null, destinatario.nome || null,
      settings.environment, '0', err.message
    );
    throw err;
  }

  const status = sidecarResult.status || 'erro';
  db.prepare(`
    INSERT INTO fiscal_invoices (
      id, establishment_id, table_order_id, serie, number, status,
      ch_nfe, protocol, xml, qrcode_url, c_stat, motivo,
      total, items_json, payments_json, customer_cpf, customer_name,
      environment
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    invoiceId, establishmentId, tableOrderId, invoiceNumber.serie, invoiceNumber.number, status,
    sidecarResult.chave || null, sidecarResult.protocolo || null,
    sidecarResult.xml || null, sidecarResult.qrcode || null,
    sidecarResult.codigo || null, sidecarResult.motivo || null,
    total, JSON.stringify(fiscalItems), JSON.stringify(pagamentos),
    destinatario.cpf || null, destinatario.nome || null,
    settings.environment
  );

  return db.prepare('SELECT * FROM fiscal_invoices WHERE id = ?').get(invoiceId) as FiscalInvoice;
}

export async function cancelNfce(establishmentId: string, invoiceId: string, reason: string): Promise<FiscalInvoice> {
  const invoice = db.prepare('SELECT * FROM fiscal_invoices WHERE id = ? AND establishment_id = ?').get(invoiceId, establishmentId) as any;
  if (!invoice) throw new Error('Nota fiscal não encontrada');
  if (invoice.status !== 'autorizada') throw new Error(`Nota com status '${invoice.status}' não pode ser cancelada`);
  if (!invoice.ch_nfe || !invoice.protocol) throw new Error('Chave e protocolo são obrigatórios para cancelamento');

  const settings = getRawFiscalSettings(establishmentId);
  if (!settings || !settings.cert_pfx_base64) {
    throw new Error('Configurações fiscais não encontradas');
  }

  const payload = {
    empresa: {
      razaosocial: settings.company_name,
      cnpj: settings.cnpj,
      siglaUF: settings.uf,
      ambiente: invoice.environment || settings.environment,
    },
    certificado: {
      pfx_base64: settings.cert_pfx_base64,
      senha: settings.cert_password,
    },
    chave: invoice.ch_nfe,
    protocolo: invoice.protocol,
    justificativa: reason,
  };

  const result = await callFiscalSidecar('/nfce/cancelar', payload);
  if (result.status === 'cancelada') {
    db.prepare(`
      UPDATE fiscal_invoices
      SET status = 'cancelada', cancelled_at = datetime('now'), cancel_reason = ?, xml = ?
      WHERE id = ?
    `).run(reason, result.xml || invoice.xml, invoiceId);
  } else {
    throw new Error(result.motivo || 'Cancelamento rejeitado pela SEFAZ');
  }

  return db.prepare('SELECT * FROM fiscal_invoices WHERE id = ?').get(invoiceId) as FiscalInvoice;
}

export function listFiscalInvoices(establishmentId: string, limit = 50, offset = 0): FiscalInvoice[] {
  return db.prepare(`
    SELECT * FROM fiscal_invoices
    WHERE establishment_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(establishmentId, limit, offset) as FiscalInvoice[];
}

export function getInvoiceById(establishmentId: string, id: string): FiscalInvoice | null {
  return (db.prepare('SELECT * FROM fiscal_invoices WHERE id = ? AND establishment_id = ?').get(id, establishmentId) as FiscalInvoice) || null;
}

export function formatChaveAcesso(chave: string): string {
  return (chave.match(/.{1,4}/g) || []).join(' ');
}

export function buildDanfeDocument(invoice: FiscalInvoice, establishmentName: string) {
  const isHomologacao = invoice.environment === 2;
  let items: any[] = [];
  try { items = JSON.parse(invoice.items_json || '[]'); } catch {}

  const lines: Array<{ label: string; value?: string }> = [
    { label: 'DANFE NFC-e - Documento Auxiliar' },
    { label: 'Nota Fiscal de Consumidor Eletrônica' },
    { label: 'Não permite aproveitamento de crédito' },
  ];

  if (isHomologacao) {
    lines.push({ label: '*** EMITIDA EM HOMOLOGAÇÃO ***' });
    lines.push({ label: '*** SEM VALOR FISCAL ***' });
  }

  lines.push({ label: '--------------------------------' });
  items.forEach((it, i) => {
    lines.push({
      label: `${i + 1}. ${it.descricao}`,
      value: `${it.quantidade} ${it.unidade || 'UN'} x R$ ${Number(it.valor_unitario).toFixed(2)} = R$ ${Number(it.valor_total).toFixed(2)}`,
    });
  });

  lines.push({ label: '--------------------------------' });
  lines.push({ label: 'TOTAL', value: `R$ ${Number(invoice.total).toFixed(2)}` });

  let pagamentos: any[] = [];
  try { pagamentos = JSON.parse(invoice.payments_json || '[]'); } catch {}
  if (pagamentos.length > 0) {
    pagamentos.forEach(p => {
      lines.push({ label: 'FORMA PGTO', value: `R$ ${Number(p.valor).toFixed(2)}` });
    });
  }

  lines.push({ label: '--------------------------------' });
  lines.push({ label: 'NFC-e Nº', value: `${invoice.number} Série: ${invoice.serie}` });
  lines.push({ label: 'EMISSÃO', value: invoice.created_at || new Date().toISOString() });
  if (invoice.protocol) {
    lines.push({ label: 'PROTOCOLO', value: invoice.protocol });
  }
  if (invoice.customer_cpf) {
    lines.push({ label: 'CONSUMIDOR', value: `CPF: ${invoice.customer_cpf}` });
  } else {
    lines.push({ label: 'CONSUMIDOR NÃO IDENTIFICADO' });
  }

  if (invoice.ch_nfe) {
    lines.push({ label: 'CHAVE DE ACESSO' });
    lines.push({ label: formatChaveAcesso(invoice.ch_nfe) });
  }

  return {
    establishment: establishmentName,
    title: 'COMPROVANTE FISCAL',
    lines,
    qrValue: invoice.qrcode_url,
    footer: 'Consulte pela Chave de Acesso no portal da SEFAZ',
  };
}

export function buildDanfeEscpos(invoice: FiscalInvoice, establishmentName: string, paperWidth = 80): Buffer {
  const doc = buildDanfeDocument(invoice, establishmentName);
  return buildReceipt(doc, paperWidth);
}

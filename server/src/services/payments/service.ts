import { v4 as uuid } from 'uuid';
import QRCode from 'qrcode';
import db from '../../db/schema.js';
import { logger } from '../../lib/logger.js';

export interface PaymentSettings {
  establishment_id: string;
  provider: 'mercadopago' | 'mock';
  access_token?: string;
  public_key?: string;
  webhook_secret?: string;
  pix_key?: string;
  auto_approve_test: number;
  active: number;
  updated_at?: string;
}

export interface PaymentRecord {
  id: string;
  establishment_id: string;
  order_id?: string;
  table_order_id?: string;
  provider: string;
  external_id?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  method: string;
  amount: number;
  qr_code?: string;
  qr_code_base64?: string;
  ticket_url?: string;
  payer_email?: string;
  payer_name?: string;
  payer_cpf?: string;
  paid_at?: string;
  expires_at?: string;
  raw_payload?: string;
  created_at?: string;
  updated_at?: string;
}

export function getPaymentSettings(establishmentId: string): PaymentSettings | null {
  const row = db.prepare('SELECT * FROM payment_settings WHERE establishment_id = ?').get(establishmentId) as any;
  if (!row) return null;
  return {
    ...row,
    has_credentials: !!row.access_token,
    // Mascara token secreto na exibição
    access_token: row.access_token ? '***' : undefined,
    webhook_secret: row.webhook_secret ? '***' : undefined,
  };
}

export function getRawPaymentSettings(establishmentId: string): any {
  return db.prepare('SELECT * FROM payment_settings WHERE establishment_id = ?').get(establishmentId);
}

export function savePaymentSettings(establishmentId: string, data: any) {
  if (process.env.NODE_ENV === 'production' && (data.provider === 'mock' || data.auto_approve_test)) {
    throw new Error('Modo mock e aprovação automática estão proibidos em produção');
  }
  const existing = db.prepare('SELECT * FROM payment_settings WHERE establishment_id = ?').get(establishmentId) as any;
  const merged = { ...existing, ...data };

  const accessToken = (data.access_token && data.access_token !== '***')
    ? data.access_token
    : existing?.access_token || '';

  const webhookSecret = (data.webhook_secret && data.webhook_secret !== '***')
    ? data.webhook_secret
    : existing?.webhook_secret || '';

  db.prepare(`
    INSERT INTO payment_settings (
      establishment_id, provider, access_token, public_key, webhook_secret,
      pix_key, auto_approve_test, active, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,datetime('now'))
    ON CONFLICT(establishment_id) DO UPDATE SET
      provider=excluded.provider, access_token=excluded.access_token, public_key=excluded.public_key,
      webhook_secret=excluded.webhook_secret, pix_key=excluded.pix_key,
      auto_approve_test=excluded.auto_approve_test, active=excluded.active,
      updated_at=datetime('now')
  `).run(
    establishmentId,
    merged.provider || 'mercadopago',
    accessToken,
    merged.public_key || '',
    webhookSecret,
    merged.pix_key || '',
    merged.auto_approve_test ? 1 : 0,
    merged.active !== undefined ? (merged.active ? 1 : 0) : 1
  );

  return getPaymentSettings(establishmentId);
}

export interface CreatePixOptions {
  establishmentId: string;
  orderId?: string;
  tableOrderId?: string;
  payer?: {
    name?: string;
    email?: string;
    cpf?: string;
  };
}

export async function createPixCharge(options: CreatePixOptions): Promise<PaymentRecord> {
  const { establishmentId, orderId, tableOrderId, payer } = options;

  let amount = 0;
  let description = 'Woobar';

  if (orderId) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ? AND establishment_id = ?').get(orderId, establishmentId) as any;
    if (!order) throw new Error('Pedido não encontrado para este estabelecimento');
    amount = Number(order.total) || 0;
    description = `Woobar - Pedido #${orderId.slice(0, 6).toUpperCase()}`;
  } else if (tableOrderId) {
    const tableOrder = db.prepare('SELECT * FROM table_orders WHERE id = ? AND establishment_id = ?').get(tableOrderId, establishmentId) as any;
    if (!tableOrder) throw new Error('Comanda de mesa não encontrada');
    amount = Number(tableOrder.total) || 0;
    description = `Woobar - Mesa #${tableOrder.table_id || tableOrderId.slice(0, 4)}`;
  } else {
    throw new Error('Informe orderId ou tableOrderId para gerar a cobrança PIX');
  }

  if (amount <= 0) {
    throw new Error('Valor da cobrança deve ser maior que zero');
  }

  const settings = getRawPaymentSettings(establishmentId);
  const paymentId = uuid();
  let externalId: string | null = null;
  let qrCode = '';
  let qrCodeBase64 = '';
  let ticketUrl = '';
  let expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos

  const isRealMercadoPago = settings?.provider === 'mercadopago' && settings?.access_token && settings.access_token.length > 10;

  if (isRealMercadoPago) {
    try {
      const appUrl = process.env.APP_URL || 'https://woobar.app';
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.access_token}`,
          'X-Idempotency-Key': paymentId,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description,
          payment_method_id: 'pix',
          notification_url: `${appUrl}/api/payments/webhook/mercadopago`,
          external_reference: paymentId,
          payer: {
            email: payer?.email || 'cliente@woobar.com',
            first_name: (payer?.name || 'Cliente').split(' ')[0],
            last_name: (payer?.name || 'Woobar').split(' ').slice(1).join(' ') || 'Woobar',
            identification: payer?.cpf ? { type: 'CPF', number: payer.cpf.replace(/\D/g, '') } : undefined,
          },
        }),
      });

      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        logger.warn('Erro na API Mercado Pago, usando fallback simulador', { mpData });
        throw new Error(mpData.message || 'Falha na comunicação com o Mercado Pago');
      }

      externalId = String(mpData.id);
      qrCode = mpData.point_of_interaction?.transaction_data?.qr_code || '';
      qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64 || '';
      ticketUrl = mpData.point_of_interaction?.transaction_data?.ticket_url || '';
      if (mpData.date_of_expiration) {
        expiresAt = mpData.date_of_expiration;
      }
    } catch (e: any) {
      logger.warn('Mercado Pago indisponível, gerando PIX simulado local', { error: e.message });
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Mercado Pago indisponível; cobrança PIX não foi criada');
      }
      // Gera QR Code simulado apenas em desenvolvimento/homologação.
      qrCode = `00020101021226830014br.gov.bcb.pix2561pix.woobar.com/qr/${paymentId}520400005303986540${amount.toFixed(2)}5802BR5906WOOBAR6009SAO PAULO62070503***6304`;
      qrCodeBase64 = (await QRCode.toDataURL(qrCode, { width: 300, margin: 2 })).replace(/^data:image\/png;base64,/, '');
      externalId = `sim_${paymentId.slice(0, 8)}`;
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Gateway PIX não configurado para este estabelecimento');
    }
    // Modo Simulação / Demonstração (ou sem credenciais de produção)
    qrCode = `00020101021226830014br.gov.bcb.pix2561pix.woobar.com/qr/${paymentId}520400005303986540${amount.toFixed(2)}5802BR5906WOOBAR6009SAO PAULO62070503***6304`;
    qrCodeBase64 = (await QRCode.toDataURL(qrCode, { width: 300, margin: 2 })).replace(/^data:image\/png;base64,/, '');
    externalId = `sim_${paymentId.slice(0, 8)}`;
  }

  db.prepare(`
    INSERT INTO payments (
      id, establishment_id, order_id, table_order_id, provider, external_id,
      status, method, amount, qr_code, qr_code_base64, ticket_url,
      payer_email, payer_name, payer_cpf, expires_at, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
  `).run(
    paymentId, establishmentId, orderId || null, tableOrderId || null,
    settings?.provider || 'mercadopago', externalId,
    'pending', 'pix', amount, qrCode, qrCodeBase64, ticketUrl,
    payer?.email || null, payer?.name || null, payer?.cpf || null, expiresAt
  );

  if (orderId) {
    db.prepare("UPDATE orders SET payment_status = 'pending', payment_method = 'pix' WHERE id = ?").run(orderId);
  }
  if (tableOrderId) {
    db.prepare("UPDATE table_orders SET payment_status = 'pending', payment_method = 'pix' WHERE id = ?").run(tableOrderId);
  }

  // Se auto_approve_test estiver ativo no estabelecimento (para testes automatizados de fluxo)
  if (settings?.auto_approve_test) {
    setTimeout(() => {
      processPaymentApproved(paymentId).catch(() => {});
    }, 1000);
  }

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId) as PaymentRecord;
}

export function getPaymentById(id: string): PaymentRecord | null {
  return (db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as PaymentRecord) || null;
}

export async function processPaymentApproved(paymentId: string, externalData?: any): Promise<PaymentRecord> {
  const payment = getPaymentById(paymentId);
  if (!payment) throw new Error('Pagamento não encontrado');

  if (payment.status === 'approved') {
    return payment; // Já aprovado
  }

  db.prepare(`
    UPDATE payments
    SET status = 'approved', paid_at = datetime('now'), updated_at = datetime('now'),
        raw_payload = ?
    WHERE id = ? AND status = 'pending'
  `).run(externalData ? JSON.stringify(externalData) : null, paymentId);

  // Atualiza pedido
  if (payment.order_id) {
    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid', payment_method = 'pix',
          status = CASE WHEN status = 'pending' THEN 'preparing' ELSE status END
      WHERE id = ?
    `).run(payment.order_id);

    // Emite WebSocket broadcast
    try {
      (globalThis as any).broadcastWS?.(
        {
          type: 'payment_approved',
          data: {
            payment_id: paymentId,
            order_id: payment.order_id,
            status: 'approved',
            amount: payment.amount,
          },
        },
        payment.establishment_id
      );
    } catch (e) {
      logger.warn('Falha no broadcast WS de pagamento', { error: e });
    }
  }

  // Atualiza mesa
  if (payment.table_order_id) {
    db.prepare(`
      UPDATE table_orders
      SET payment_status = 'paid', payment_method = 'pix'
      WHERE id = ?
    `).run(payment.table_order_id);

    try {
      (globalThis as any).broadcastWS?.(
        {
          type: 'payment_approved',
          data: {
            payment_id: paymentId,
            table_order_id: payment.table_order_id,
            status: 'approved',
            amount: payment.amount,
          },
        },
        payment.establishment_id
      );
    } catch (e) {
      logger.warn('Falha no broadcast WS de pagamento', { error: e });
    }
  }

  logger.info('Pagamento PIX confirmado com sucesso', { paymentId, amount: payment.amount });
  return getPaymentById(paymentId)!;
}

export async function handleMercadoPagoWebhook(query: any, body: any): Promise<{ handled: boolean; status?: string }> {
  const externalId = String(body?.data?.id || query?.id || query?.['data.id'] || '');
  if (!externalId) {
    return { handled: false };
  }

  // Busca pagamento pelo external_id
  const payment = db.prepare('SELECT * FROM payments WHERE external_id = ?').get(externalId) as PaymentRecord | undefined;
  if (!payment) {
    logger.info('Webhook recebido para pagamento não registrado localmente', { externalId });
    return { handled: true, status: 'not_found' };
  }

  const settings = getRawPaymentSettings(payment.establishment_id);
  if (!settings?.access_token) {
    return { handled: true, status: 'missing_token' };
  }

  // Consulta API Mercado Pago para validar status oficial
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${externalId}`, {
      headers: {
        Authorization: `Bearer ${settings.access_token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`MP status ${res.status}`);
    }

    const data = await res.json();
    if (data.status === 'approved') {
      await processPaymentApproved(payment.id, data);
      return { handled: true, status: 'approved' };
    } else if (data.status === 'rejected' || data.status === 'cancelled') {
      db.prepare("UPDATE payments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(data.status, payment.id);
      return { handled: true, status: data.status };
    }
    return { handled: true, status: data.status };
  } catch (err: any) {
    logger.warn('Falha ao consultar Mercado Pago no webhook', { error: err.message, externalId });
    return { handled: false };
  }
}

export function listPayments(establishmentId: string, limit = 50, offset = 0): PaymentRecord[] {
  return db.prepare(`
    SELECT * FROM payments
    WHERE establishment_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(establishmentId, limit, offset) as PaymentRecord[];
}

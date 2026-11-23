import { supabase } from './supabase';
import { resolveTenantId } from './tenant';

export interface PixCharge {
  id: string;
  qrCodeImage?: string;
  copyPaste: string;
  status: 'pending' | 'approved' | 'expired' | 'cancelled';
  amount: number;
  provider: string;
  createdAt: string;
}

export interface PaymentIntegration {
  id: string;
  tenantId: string;
  provider: string;
  apiKey: string | null;
  apiSecret: string | null;
  pixKey: string | null;
  isActive: boolean;
}

export async function getActiveIntegration(): Promise<PaymentIntegration | null> {
  try {
    const tenantId = await resolveTenantId();
    const { data, error } = await supabase
      .from('payment_integrations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      tenantId: data.tenant_id,
      provider: data.provider,
      apiKey: data.api_key || null,
      apiSecret: data.api_secret || null,
      pixKey: data.pix_key || null,
      isActive: data.is_active
    };
  } catch (err) {
    console.error('Error fetching integration:', err);
    return null;
  }
}

export async function createPixCharge(amount: number, description: string): Promise<PixCharge | null> {
  const integration = await getActiveIntegration();
  if (!integration) {
    throw new Error('Nenhuma integração de pagamento ativa. Configure em Integrações.');
  }

  if (!integration.apiKey) {
    throw new Error('API Key não configurada para o gateway.');
  }

  switch (integration.provider) {
    case 'asaas':
      return createAsaasPix(integration, amount, description);
    case 'mercadopago':
      return createMercadoPagoPix(integration, amount, description);
    case 'pagbank':
      return createPagBankPix(integration, amount, description);
    default:
      throw new Error(`Gateway ${integration.provider} não suportado para PIX.`);
  }
}

async function createAsaasPix(integration: PaymentIntegration, amount: number, description: string): Promise<PixCharge> {
  const response = await fetch('https://api.asaas.com/v3/pix/qrCodes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'access_token': integration.apiKey,
      'User-Agent': 'Woobar/1.0'
    },
    body: JSON.stringify({
      value: amount,
      description: description || 'Cobrança Woobar',
      expireAt: getFutureDateMinutes(30),
      additionalInfo: 'Cobrança gerada pelo Woobar'
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro Asaas: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    id: data.id,
    qrCodeImage: data.image,
    copyPaste: data.payload || data.copyAndPaste || '',
    status: mapAsaasStatus(data.status),
    amount: amount,
    provider: 'asaas',
    createdAt: new Date().toISOString()
  };
}

async function createMercadoPagoPix(integration: PaymentIntegration, amount: number, description: string): Promise<PixCharge> {
  const accessToken = integration.apiKey;

  const response = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'X-Idempotency-Key': crypto.randomUUID()
    },
    body: JSON.stringify({
      transaction_amount: amount,
      description: description || 'Cobrança Woobar',
      payment_method_id: 'pix',
      payer: {
        email: 'cliente@woobar.com'
      },
      date_of_expiration: getFutureDateMinutes(30)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro MercadoPago: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const pixData = data.point_of_interaction?.transaction_data || {};

  return {
    id: String(data.id),
    qrCodeImage: pixData.qr_code_base64 || undefined,
    copyPaste: pixData.qr_code || '',
    status: mapMercadoPagoStatus(data.status),
    amount: amount,
    provider: 'mercadopago',
    createdAt: new Date().toISOString()
  };
}

async function createPagBankPix(integration: PaymentIntegration, amount: number, description: string): Promise<PixCharge> {
  const response = await fetch('https://api.pagseguro.com/pix/cash-in/qrcodes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${integration.apiKey}`
    },
    body: JSON.stringify({
      value: {
        amount: amount
      },
      description: description || 'Cobrança Woobar',
      expiration_date: getFutureDateMinutes(30)
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro PagBank: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  return {
    id: data.id || crypto.randomUUID(),
    qrCodeImage: data.qrcode_image,
    copyPaste: data.qrcode_copy_paste || data.copy_and_paste || '',
    status: 'pending',
    amount: amount,
    provider: 'pagbank',
    createdAt: new Date().toISOString()
  };
}

export async function checkPixStatus(chargeId: string, provider: string): Promise<PixCharge['status']> {
  const integration = await getActiveIntegration();
  if (!integration || !integration.apiKey) {
    return 'pending';
  }

  try {
    switch (provider) {
      case 'asaas': {
        const res = await fetch(`https://api.asaas.com/v3/pix/qrCodes/${chargeId}`, {
          headers: {
            'access_token': integration.apiKey,
            'User-Agent': 'Woobar/1.0'
          }
        });
        if (!res.ok) return 'pending';
        const data = await res.json();
        return mapAsaasStatus(data.status);
      }
      case 'mercadopago': {
        const res = await fetch(`https://api.mercadopago.com/v1/payments/${chargeId}`, {
          headers: {
            'Authorization': `Bearer ${integration.apiKey}`
          }
        });
        if (!res.ok) return 'pending';
        const data = await res.json();
        return mapMercadoPagoStatus(data.status);
      }
      default:
        return 'pending';
    }
  } catch {
    return 'pending';
  }
}

function mapAsaasStatus(status: string): PixCharge['status'] {
  switch (status) {
    case 'ACTIVE':
    case 'PENDING':
      return 'pending';
    case 'RECEIVED':
    case 'CONFIRMED':
      return 'approved';
    case 'EXPIRED':
      return 'expired';
    case 'CANCELLED':
      return 'cancelled';
    default:
      return 'pending';
  }
}

function mapMercadoPagoStatus(status: string): PixCharge['status'] {
  switch (status) {
    case 'pending':
    case 'in_process':
      return 'pending';
    case 'approved':
    case 'authorized':
      return 'approved';
    case 'expired':
    case 'cancelled':
    case 'refunded':
      return status === 'expired' ? 'expired' : 'cancelled';
    default:
      return 'pending';
  }
}

function getFutureDateMinutes(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

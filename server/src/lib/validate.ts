import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { ROLES } from './roles.js';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({ field: i.path.join('.'), message: i.message }));
      res.status(400).json({ error: 'Dados inválidos', details: errors });
      return;
    }
    req.body = result.data;
    next();
  };
}

export const schemas = {
  login: z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(1, 'Senha é obrigatória'),
  }),

  register: z.object({
    name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').regex(/[A-Za-z]/, 'Senha deve conter pelo menos uma letra').regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
    role: z.enum(ROLES).optional().default('attendant'),
    establishment_id: z.string().min(1).optional(),
  }),

  createUser: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Za-z]/, 'Deve conter pelo menos uma letra').regex(/[0-9]/, 'Deve conter pelo menos um número'),
    role: z.enum(ROLES).optional().default('attendant'),
    establishment_id: z.string().min(1).optional(),
  }),

  createProduct: z.object({
    name: z.string().min(1),
    description: z.string().optional().default(''),
    price: z.number().positive(),
    category_id: z.string().optional(),
    image: z.string().optional(),
    ncm: z.string().length(8, 'NCM deve ter 8 dígitos').optional().default('22030000'),
    cfop: z.string().length(4, 'CFOP deve ter 4 dígitos').optional().default('5102'),
    csosn: z.string().optional().default('102'),
    origin: z.number().int().min(0).max(8).optional().default(0),
    unit: z.string().optional().default('UN'),
  }),

  createOrder: z.object({
    customer_name: z.string().min(1),
    customer_phone: z.string().optional(),
    customer_address: z.string().optional(),
    items: z.array(z.any()).optional().default([]),
    total: z.number().min(0).optional().default(0),
    payment_method: z.string().optional(),
    channel: z.string().optional().default('website'),
  }),

  updateStatus: z.object({
    status: z.enum(['pending', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled']),
    courier_id: z.string().optional(),
  }),

  sellTokens: z.object({
    items: z.array(z.object({
      product_id: z.string().optional(),
      name: z.string().min(1),
      price: z.number().min(0).optional().default(0),
      quantity: z.number().int().positive().optional().default(1),
      type: z.enum(['token', 'ticket']).optional().default('token'),
    })),
    payment_method: z.string().optional(),
  }),

  sellTickets: z.object({
    event_id: z.string().min(1),
    ticket_type_id: z.string().min(1),
    quantity: z.number().int().positive(),
    total: z.number().min(0).optional().default(0),
    buyer_name: z.string().optional(),
    buyer_email: z.string().email().optional().or(z.literal('')),
  }),

  coverEntry: z.object({
    amount: z.number().positive().optional(),
    method: z.string().optional(),
  }),

  coverExit: z.object({
    amount: z.number().positive().optional(),
    method: z.string().optional(),
  }),

  inventoryItem: z.object({
    name: z.string().min(1),
    unit: z.string().optional().default('un'),
    current_stock: z.number().min(0).optional().default(0),
    min_stock: z.number().min(0).optional().default(0),
    cost_price: z.number().min(0).optional().default(0),
    category: z.string().optional(),
  }),

  addMovement: z.object({
    item_id: z.string().min(1),
    type: z.enum(['in', 'out']),
    quantity: z.number().positive(),
    unit_cost: z.number().optional(),
    reason: z.string().optional(),
  }),

  createEvent: z.object({
    title: z.string().min(1, 'Título é obrigatório'),
    date: z.string().min(1, 'Data é obrigatória'),
    time: z.string().optional(),
    location: z.string().optional(),
    image: z.string().optional(),
    description: z.string().optional(),
  }),

  createTicketType: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    price: z.number().positive('Preço deve ser positivo'),
    available: z.number().int().min(0).optional().default(0),
  }),

  createChannel: z.object({
    name: z.string().min(1, 'Nome é obrigatório'),
    type: z.enum(['ifood', 'uber', 'rappi', 'food99', 'whatsapp', 'website', 'facebook', 'instagram']),
    api_key: z.string().optional(),
    webhook_url: z.string().optional(),
    config_json: z.any().optional(),
  }),

  updateChannel: z.object({
    name: z.string().min(1).optional(),
    api_key: z.string().optional(),
    webhook_url: z.string().optional(),
    webhook_secret: z.string().optional(),
    config_json: z.any().optional(),
  }),

  updateCoverConfig: z.object({
    price: z.number().positive('Preço deve ser positivo').optional(),
    capacity: z.number().int().positive('Capacidade deve ser positiva').optional(),
  }),

  addTableOrderItem: z.object({
    product_id: z.string().optional(),
    product_name: z.string().min(1, 'Nome do produto é obrigatório').optional(),
    quantity: z.number().int().positive('Quantidade deve ser positiva'),
    price: z.number().positive('Preço deve ser positivo').optional(),
    notes: z.string().optional(),
  }).refine((data) => !!data.product_id || (!!data.product_name && data.price !== undefined), {
    message: 'Nome e preço são obrigatórios quando o produto não é do cardápio',
  }),

  validateCode: z.object({
    code: z.string().min(1, 'Código é obrigatório'),
  }),

  fiscalSettings: z.object({
    environment: z.union([z.literal(1), z.literal(2)]).optional().default(2),
    company_name: z.string().min(2, 'Razão social é obrigatória'),
    fantasy_name: z.string().optional(),
    cnpj: z.string().min(14, 'CNPJ deve ter 14 dígitos'),
    ie: z.string().min(2, 'Inscrição Estadual é obrigatória'),
    crt: z.number().int().min(1).max(3).optional().default(1),
    uf: z.string().length(2, 'UF deve ter 2 letras'),
    ibge_code: z.number().int().positive('Código IBGE inválido'),
    city: z.string().min(2, 'Cidade é obrigatória'),
    street: z.string().min(2, 'Logradouro é obrigatório'),
    number: z.string().min(1, 'Número é obrigatório'),
    complement: z.string().optional(),
    neighborhood: z.string().min(1, 'Bairro é obrigatório'),
    zip_code: z.string().min(8, 'CEP inválido'),
    phone: z.string().optional(),
    csc: z.string().min(1, 'CSC é obrigatório'),
    csc_id: z.string().min(1, 'CSC ID é obrigatório'),
    cert_pfx_base64: z.string().optional(),
    cert_password: z.string().optional(),
    serie: z.number().int().positive().optional().default(1),
    auto_emit_on_closing: z.union([z.literal(0), z.literal(1), z.boolean()]).optional().default(0),
  }),

  emitNfce: z.object({
    customer_cpf: z.string().optional(),
    customer_name: z.string().optional(),
  }),

  cancelNfce: z.object({
    justificativa: z.string().min(15, 'Justificativa deve ter no mínimo 15 caracteres').max(255),
  }),

  paymentSettings: z.object({
    provider: z.enum(['mercadopago', 'mock']).optional().default('mercadopago'),
    access_token: z.string().optional(),
    public_key: z.string().optional(),
    webhook_secret: z.string().optional(),
    pix_key: z.string().optional(),
    auto_approve_test: z.union([z.literal(0), z.literal(1), z.boolean()]).optional().default(0),
    active: z.union([z.literal(0), z.literal(1), z.boolean()]).optional().default(1),
  }),

  createPixCharge: z.object({
    payer_name: z.string().optional(),
    payer_email: z.string().email().optional().or(z.literal('')),
    payer_cpf: z.string().optional(),
  }),
};

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
    product_name: z.string().min(1, 'Nome do produto é obrigatório'),
    quantity: z.number().int().positive('Quantidade deve ser positiva'),
    price: z.number().positive('Preço deve ser positivo'),
    notes: z.string().optional(),
  }),

  validateCode: z.object({
    code: z.string().min(1, 'Código é obrigatório'),
  }),
};

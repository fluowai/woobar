import { Router, Request, Response } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import * as paymentService from '../services/payments/service.js';
import db from '../db/schema.js';

// Roteador público para webhooks
export const paymentWebhookRouter = Router();

paymentWebhookRouter.post('/mercadopago', async (req: Request, res: Response) => {
  try {
    const result = await paymentService.handleMercadoPagoWebhook(req.query, req.body);
    res.status(200).json({ received: true, ...result });
  } catch (err: any) {
    res.status(200).json({ received: true, error: err.message });
  }
});

paymentWebhookRouter.get('/mercadopago', async (req: Request, res: Response) => {
  // Mercado Pago testa endpoints enviando GET
  res.status(200).send('OK');
});

// Roteador público para Totem e Cardápio Digital (sem login prévio)
export const publicPaymentRouter = Router();

publicPaymentRouter.post('/pix/order/:id', validate(schemas.createPixCharge), async (req: Request, res: Response) => {
  try {
    const order = db.prepare('SELECT establishment_id FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      res.status(404).json({ error: 'Pedido não encontrado' });
      return;
    }

    const payment = await paymentService.createPixCharge({
      establishmentId: order.establishment_id,
      orderId: req.params.id,
      payer: {
        name: req.body.payer_name,
        email: req.body.payer_email,
        cpf: req.body.payer_cpf,
      },
    });

    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

publicPaymentRouter.get('/status/:id', (req: Request, res: Response) => {
  const payment = paymentService.getPaymentById(req.params.id);
  if (!payment) {
    res.status(404).json({ error: 'Pagamento não encontrado' });
    return;
  }
  res.json({
    id: payment.id,
    status: payment.status,
    amount: payment.amount,
    paid_at: payment.paid_at,
    expires_at: payment.expires_at,
  });
});

// Roteador autenticado para equipe e administração
const router = Router();
router.use(authMiddleware);

// Obter configurações de gateway
router.get('/settings', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const settings = paymentService.getPaymentSettings(req.user!.establishment_id);
  res.json(settings || { provider: 'mercadopago', active: 1 });
});

// Salvar credenciais de gateway
router.put('/settings', roleGuard('admin'), validate(schemas.paymentSettings), (req: Request, res: Response) => {
  try {
    const updated = paymentService.savePaymentSettings(req.user!.establishment_id, req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Gerar PIX para comanda de mesa
router.post('/pix/table/:id', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.createPixCharge), async (req: Request, res: Response) => {
  try {
    const payment = await paymentService.createPixCharge({
      establishmentId: req.user!.establishment_id,
      tableOrderId: req.params.id,
      payer: {
        name: req.body.payer_name,
        email: req.body.payer_email,
        cpf: req.body.payer_cpf,
      },
    });
    res.status(201).json(payment);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Listar histórico de pagamentos
router.get('/history', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const list = paymentService.listPayments(req.user!.establishment_id, limit, offset);
  res.json(list);
});

// Simular confirmação de pagamento (útil em homologação e testes)
router.post('/simulate-approval/:id', roleGuard('admin', 'manager'), async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Rota não encontrada' });
    return;
  }
  try {
    const payment = paymentService.getPaymentById(req.params.id);
    if (!payment || payment.establishment_id !== req.user!.establishment_id) {
      res.status(404).json({ error: 'Pagamento não encontrado' });
      return;
    }
    const updated = await paymentService.processPaymentApproved(payment.id, { simulation: true });
    res.json({ success: true, payment: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;

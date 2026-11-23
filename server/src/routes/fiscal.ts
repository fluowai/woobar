import { Router, Request, Response } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import * as fiscalService from '../services/fiscal.js';
import db from '../db/schema.js';
import { queuePrint } from '../services/printing/service.js';

const router = Router();
router.use(authMiddleware);

const OPERATIONAL = ['admin', 'manager', 'waiter', 'attendant'];

// Obter configurações fiscais da loja
router.get('/settings', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const settings = fiscalService.getFiscalSettings(req.user!.establishment_id);
  res.json(settings || {});
});

// Atualizar configurações fiscais
router.put('/settings', roleGuard('admin'), validate(schemas.fiscalSettings), (req: Request, res: Response) => {
  try {
    const updated = fiscalService.saveFiscalSettings(req.user!.establishment_id, req.body);
    res.json({ success: true, settings: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Verificar status do serviço na SEFAZ
router.get('/status', roleGuard('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const status = await fiscalService.checkFiscalStatus(req.user!.establishment_id);
    res.json(status);
  } catch (err: any) {
    res.status(502).json({ error: err.message });
  }
});

// Listar notas fiscais emitidas
router.get('/invoices', roleGuard(...OPERATIONAL), (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 100);
  const offset = Number(req.query.offset) || 0;
  const invoices = fiscalService.listFiscalInvoices(req.user!.establishment_id, limit, offset);
  res.json(invoices);
});

// Detalhes de uma nota fiscal
router.get('/invoices/:id', roleGuard(...OPERATIONAL), (req: Request, res: Response) => {
  const invoice = fiscalService.getInvoiceById(req.user!.establishment_id, req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Nota fiscal não encontrada' });
    return;
  }
  res.json(invoice);
});

// Download do XML protocolado da nota fiscal
router.get('/invoices/:id/xml', roleGuard(...OPERATIONAL), (req: Request, res: Response) => {
  const invoice = fiscalService.getInvoiceById(req.user!.establishment_id, req.params.id);
  if (!invoice || !invoice.xml) {
    res.status(404).json({ error: 'XML da nota fiscal não disponível' });
    return;
  }
  res.setHeader('Content-Type', 'application/xml');
  res.setHeader('Content-Disposition', `attachment; filename="NFCe-${invoice.ch_nfe || invoice.number}.xml"`);
  res.send(invoice.xml);
});

// Emitir NFC-e a partir de um pedido (Delivery/Balcão)
router.post('/emit-order/:id', roleGuard(...OPERATIONAL), validate(schemas.emitNfce), async (req: Request, res: Response) => {
  try {
    const customer = {
      cpf: req.body.customer_cpf,
      name: req.body.customer_name,
    };
    const invoice = await fiscalService.emitNfceForOrder(req.user!.establishment_id, req.params.id, customer);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Emitir NFC-e a partir de uma comanda de mesa fechada
router.post('/emit-table-order/:id', roleGuard(...OPERATIONAL), validate(schemas.emitNfce), async (req: Request, res: Response) => {
  try {
    const customer = {
      cpf: req.body.customer_cpf,
      name: req.body.customer_name,
    };
    const invoice = await fiscalService.emitNfceForTableOrder(req.user!.establishment_id, req.params.id, customer);
    res.status(201).json(invoice);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Cancelar nota fiscal na SEFAZ
router.post('/invoices/:id/cancel', roleGuard('admin', 'manager'), validate(schemas.cancelNfce), async (req: Request, res: Response) => {
  try {
    const updated = await fiscalService.cancelNfce(req.user!.establishment_id, req.params.id, req.body.justificativa);
    res.json({ success: true, invoice: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Imprimir DANFE NFC-e
router.post('/invoices/:id/print', roleGuard(...OPERATIONAL), async (req: Request, res: Response) => {
  const invoice = fiscalService.getInvoiceById(req.user!.establishment_id, req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Nota fiscal não encontrada' });
    return;
  }

  const est = db.prepare('SELECT name FROM establishments WHERE id = ?').get(req.user!.establishment_id) as any;
  const establishmentName = est?.name || 'Woobar';

  const doc = fiscalService.buildDanfeDocument(invoice, establishmentName);
  const result = await queuePrint(req.user!.establishment_id, 'nfce', invoice.id, doc);
  res.json({ success: true, result });
});

export default router;

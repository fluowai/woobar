import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { getPrinterConfig, queuePrint } from '../services/printing/service.js';
import { resolveProduct, canSetCustomPrice } from '../lib/pricing.js';

const validateCodeSchema = schemas.validateCode;

const router = Router();
router.use(authMiddleware);

router.post('/sell', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.sellTokens), async (req: Request, res: Response) => {
  const { items, payment_method } = req.body;
  const codes: { code: string; item_name: string; price: number }[] = [];

  // Preço sempre vem do servidor: resolve no cardápio; preço manual só para admin/manager
  const resolved: { name: string; price: number; quantity: number; type: string }[] = [];
  for (const item of items) {
    const product = resolveProduct(req.user!.establishment_id, item.product_id, item.name);
    if (product) {
      resolved.push({ name: product.name, price: Number(product.price), quantity: item.quantity || 1, type: item.type || 'token' });
    } else if (canSetCustomPrice(req.user!.role) && Number(item.price) > 0) {
      resolved.push({ name: item.name, price: Number(item.price), quantity: item.quantity || 1, type: item.type || 'token' });
    } else {
      res.status(400).json({ error: `Item fora do cardápio: ${item.name}` });
      return;
    }
  }

  const insert = db.prepare('INSERT INTO bar_tokens (id, establishment_id, item_name, price, code, type, payment_method) VALUES (?,?,?,?,?,?,?)');
  const txn = db.transaction(() => {
    for (const item of resolved) {
      for (let i = 0; i < (item.quantity || 1); i++) {
        const code = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
        insert.run(uuid(), req.user!.establishment_id, item.name, item.price, code, item.type, payment_method);
        codes.push({ code, item_name: item.name, price: item.price });
      }
    }
  });
  txn();
  const config = getPrinterConfig(req.user!.establishment_id);
  const establishment = db.prepare('SELECT name FROM establishments WHERE id = ?').get(req.user!.establishment_id) as any;
  const printJobs = config?.enabled && config.auto_print_tokens ? await Promise.all(codes.map(code => queuePrint(req.user!.establishment_id, 'token', code.code, {
    establishment: establishment?.name || 'Woobar', title: 'FICHA DE CONSUMO', subtitle: code.item_name, code: code.code, qrValue: code.code,
    lines: [{ label: 'Valor', value: `R$ ${Number(code.price).toFixed(2)}` }, { label: 'Pagamento', value: payment_method || 'Nao informado' }]
  }))) : [];
  res.status(201).json({ codes, total: codes.reduce((a, c) => a + c.price, 0), print_jobs: printJobs });
});

router.get('/', (req: Request, res: Response) => {
  const { status } = req.query;
  let query = 'SELECT * FROM bar_tokens WHERE establishment_id = ?';
  const params: any[] = [req.user!.establishment_id];
  if (status) { query += ' AND status = ?'; params.push(status); }
  query += ' ORDER BY created_at DESC LIMIT 100';
  res.json(db.prepare(query).all(...params));
});

router.post('/validate', roleGuard('admin', 'manager', 'waiter', 'attendant', 'kitchen', 'pantry'), validate(validateCodeSchema), (req: Request, res: Response) => {
  const { code } = req.body;
  const item = db.prepare('SELECT * FROM bar_tokens WHERE code = ? AND establishment_id = ?').get(code, req.user!.establishment_id) as any;
  if (!item) { res.json({ status: 'invalid', message: 'Código não encontrado' }); return; }
  if (item.status === 'used') { res.json({ status: 'used', message: 'Código já utilizado', details: { item: item.item_name, value: `R$ ${item.price.toFixed(2)}`, timestamp: item.created_at } }); return; }
  db.prepare('UPDATE bar_tokens SET status = ? WHERE id = ?').run('used', item.id);
  res.json({ status: 'valid', message: 'Código Válido!', details: { item: item.item_name, value: `R$ ${item.price.toFixed(2)}` } });
});

export default router;

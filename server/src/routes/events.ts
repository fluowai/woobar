import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { getPrinterConfig, queuePrint } from '../services/printing/service.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const events = db.prepare('SELECT * FROM events WHERE establishment_id = ? AND active = 1 ORDER BY date DESC').all(req.user!.establishment_id);
  const result = events.map((e: any) => {
    const tickets = db.prepare('SELECT * FROM event_tickets WHERE event_id = ?').all(e.id);
    return { ...e, tickets };
  });
  res.json(result);
});

router.post('/', roleGuard('admin', 'manager'), validate(schemas.createEvent), (req: Request, res: Response) => {
  const { title, date, time, location, image, description } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO events (id, establishment_id, title, date, time, location, image, description) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.user!.establishment_id, title, date, time, location, image, description);
  res.status(201).json({ id, title });
});

router.post('/:id/tickets', roleGuard('admin', 'manager'), validate(schemas.createTicketType), (req: Request, res: Response) => {
  const event = db.prepare('SELECT id FROM events WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!event) { res.status(404).json({ error: 'Evento não encontrado' }); return; }
  const { name, price, available } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO event_tickets (id, event_id, name, price, available) VALUES (?,?,?,?,?)').run(id, req.params.id, name, price, available);
  res.status(201).json({ id, name, price });
});

router.post('/sell', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.sellTickets), async (req: Request, res: Response) => {
  const { event_id, ticket_type_id, quantity, buyer_name, buyer_email } = req.body;
  const ticket = db.prepare(`SELECT et.*, e.title event_title, e.establishment_id, est.name establishment_name FROM event_tickets et
    JOIN events e ON e.id = et.event_id JOIN establishments est ON est.id = e.establishment_id WHERE et.id = ? AND e.id = ?`).get(ticket_type_id, event_id) as any;
  if (!ticket || ticket.available < quantity) { res.status(400).json({ error: 'Ingressos insuficientes' }); return; }
  // Isolamento de tenant: só vende ingresso do próprio estabelecimento
  if (ticket.establishment_id !== req.user!.establishment_id && req.user!.role !== 'superadmin') {
    res.status(403).json({ error: 'Evento de outro estabelecimento' });
    return;
  }

  // Total calculado no servidor — nunca confiar no valor do cliente
  const total = Math.round(Number(ticket.price) * quantity * 100) / 100;

  const code = crypto.randomUUID().replace(/-/g, '').substring(0, 16).toUpperCase();
  const saleId = uuid();
  db.prepare('INSERT INTO ticket_sales (id, event_id, ticket_type_id, quantity, total, buyer_name, buyer_email, code) VALUES (?,?,?,?,?,?,?,?)')
    .run(saleId, event_id, ticket_type_id, quantity, total, buyer_name, buyer_email, code);
  db.prepare('UPDATE event_tickets SET available = available - ?, sold = sold + ? WHERE id = ?').run(quantity, quantity, ticket_type_id);

  const config = getPrinterConfig(ticket.establishment_id);
  const printJob = config?.enabled && config.auto_print_tickets ? await queuePrint(ticket.establishment_id, 'event_ticket', saleId, {
    establishment: ticket.establishment_name || 'Woobar', title: ticket.event_title, subtitle: ticket.name, code, qrValue: code,
    lines: [{ label: 'Quantidade', value: String(quantity) }, { label: 'Total', value: `R$ ${Number(total).toFixed(2)}` }, { label: 'Comprador', value: buyer_name || 'Nao informado' }]
  }) : null;
  res.status(201).json({ id: saleId, code, total, print_job: printJob });
});

router.post('/validate', roleGuard('admin', 'manager', 'waiter', 'attendant'), validate(schemas.validateCode), (req: Request, res: Response) => {
  const { code } = req.body;
  const sale = db.prepare(`SELECT ts.* FROM ticket_sales ts
    JOIN events e ON e.id = ts.event_id
    WHERE ts.code = ? AND e.establishment_id = ?`)
    .get(code, req.user!.establishment_id) as any;
  if (!sale) { res.json({ status: 'invalid', message: 'Ingresso não encontrado' }); return; }
  if (sale.status !== 'valid') { res.json({ status: 'used', message: 'Ingresso já utilizado' }); return; }
  db.prepare('UPDATE ticket_sales SET status = ? WHERE id = ?').run('used', sale.id);
  res.json({ status: 'valid', message: 'Ingresso Válido!' });
});

export default router;

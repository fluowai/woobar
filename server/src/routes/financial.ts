import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// === Cash Register ===
router.get('/cash-register', (req: Request, res: Response) => {
  const open = db.prepare('SELECT * FROM cash_registers WHERE establishment_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 1')
    .get(req.user!.establishment_id, 'open');
  res.json(open || null);
});

router.post('/cash-register/open', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { opening_balance } = req.body;
  const existing = db.prepare('SELECT id FROM cash_registers WHERE establishment_id = ? AND status = ?').get(req.user!.establishment_id, 'open');
  if (existing) { res.status(400).json({ error: 'Já existe um caixa aberto' }); return; }
  const id = uuid();
  db.prepare('INSERT INTO cash_registers (id, establishment_id, user_id, opening_balance) VALUES (?,?,?,?)')
    .run(id, req.user!.establishment_id, req.user!.id, opening_balance || 0);
  res.status(201).json({ id });
});

type DrawerBucket = 'cash' | 'card' | 'credit' | 'debit' | 'pix' | 'other';

const bucketOf = (method?: string | null): DrawerBucket => {
  const m = (method || '').toLowerCase();
  if (m === 'cash') return 'cash';
  if (m === 'card') return 'card';
  if (m === 'credit') return 'credit';
  if (m === 'debit') return 'debit';
  if (m === 'pix') return 'pix';
  return 'other';
};

const emptyBuckets = (): Record<DrawerBucket, number> =>
  ({ cash: 0, card: 0, credit: 0, debit: 0, pix: 0, other: 0 });

router.post('/cash-register/close', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { notes } = req.body;
  const register = db.prepare('SELECT * FROM cash_registers WHERE establishment_id = ? AND status = ? ORDER BY opened_at DESC LIMIT 1')
    .get(req.user!.establishment_id, 'open') as any;
  if (!register) { res.status(400).json({ error: 'Nenhum caixa aberto' }); return; }

  const est = req.user!.establishment_id;
  const since = register.opened_at;

  const byMethod = emptyBuckets();

  const accumulate = (sql: string, sign: number, ...params: any[]) => {
    const rows = db.prepare(sql).all(...params) as { m: string; total: number }[];
    for (const row of rows) byMethod[bucketOf(row.m)] += sign * (row.total || 0);
  };

  accumulate(
    `SELECT LOWER(COALESCE(payment_method,'unknown')) as m, COALESCE(SUM(total),0) as total
     FROM orders WHERE establishment_id = ? AND created_at >= ? AND status != 'cancelled' GROUP BY m`,
    1, est, since);

  accumulate(
    `SELECT LOWER(COALESCE(payment_method,'unknown')) as m, COALESCE(SUM(total),0) as total
     FROM table_orders WHERE establishment_id = ? AND status = 'closed' AND closed_at >= ? GROUP BY m`,
    1, est, since);

  accumulate(
    `SELECT LOWER(COALESCE(payment_method,'unknown')) as m, COALESCE(SUM(price),0) as total
     FROM bar_tokens WHERE establishment_id = ? AND created_at >= ? GROUP BY m`,
    1, est, since);

  accumulate(
    `SELECT LOWER(COALESCE(method,'unknown')) as m, COALESCE(SUM(amount),0) as total
     FROM cover_charge WHERE establishment_id = ? AND created_at >= ? AND type = 'entry' GROUP BY m`,
    1, est, since);

  accumulate(
    `SELECT LOWER(COALESCE(method,'unknown')) as m, COALESCE(SUM(amount),0) as total
     FROM cover_charge WHERE establishment_id = ? AND created_at >= ? AND type = 'exit' GROUP BY m`,
    -1, est, since);

  const tickets = db.prepare(
    `SELECT COALESCE(SUM(ts.total),0) as total FROM ticket_sales ts
     JOIN events e ON ts.event_id = e.id
     WHERE e.establishment_id = ? AND ts.created_at >= ? AND ts.status != 'cancelled'`)
    .get(est, since) as any;
  const ticketTotal = tickets?.total || 0;

  const drawerTotal = byMethod.cash + byMethod.card + byMethod.credit + byMethod.debit + byMethod.pix;
  const totalRevenue = drawerTotal + byMethod.other + ticketTotal;
  const expectedCash = (register.opening_balance || 0) + byMethod.cash;

  db.prepare(`UPDATE cash_registers SET status = ?, closed_at = datetime('now'), closing_balance = ?, total_cash = ?, total_card = ?, total_pix = ?, total_debit = ?, total_credit = ?, notes = ? WHERE id = ?`)
    .run('closed', expectedCash, byMethod.cash, byMethod.card, byMethod.pix, byMethod.debit, byMethod.credit, notes, register.id);

  res.json({
    success: true,
    total: totalRevenue,
    since,
    revenue_by_method: { ...byMethod, tickets: ticketTotal },
    drawer: { opening_balance: register.opening_balance || 0, expected_cash: expectedCash },
  });
});

// === Dashboard Summary ===
router.get('/dashboard', (req: Request, res: Response) => {
  const todaySales = db.prepare("SELECT COALESCE(SUM(total),0) as total FROM orders WHERE establishment_id = ? AND date(created_at) = date('now') AND status != 'cancelled'")
    .get(req.user!.establishment_id) as any;
  const todayOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE establishment_id = ? AND date(created_at) = date('now')")
    .get(req.user!.establishment_id) as any;
  const todayTokens = db.prepare("SELECT COUNT(*) as count FROM bar_tokens WHERE establishment_id = ? AND date(created_at) = date('now')")
    .get(req.user!.establishment_id) as any;
  const coverCount = db.prepare("SELECT COUNT(*) as count FROM cover_charge WHERE establishment_id = ? AND type = 'entry' AND date(created_at) = date('now')")
    .get(req.user!.establishment_id) as any;

  const pendingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE establishment_id = ? AND status = 'pending'")
    .get(req.user!.establishment_id) as any;
  const preparingOrders = db.prepare("SELECT COUNT(*) as count FROM orders WHERE establishment_id = ? AND status = 'preparing'")
    .get(req.user!.establishment_id) as any;

  res.json({
    sales_today: todaySales?.total || 0,
    orders_today: todayOrders?.count || 0,
    tokens_today: todayTokens?.count || 0,
    cover_today: coverCount?.count || 0,
    pending_orders: pendingOrders?.count || 0,
    preparing_orders: preparingOrders?.count || 0,
  });
});

// === DRE (Demonstração do Resultado) ===
router.get('/dre', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;
  const start = start_date || new Date().toISOString().split('T')[0];
  const end = end_date || new Date().toISOString().split('T')[0];

  const grossRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) as total FROM orders WHERE establishment_id = ? AND date(created_at) BETWEEN ? AND ? AND status != 'cancelled'`)
    .get(req.user!.establishment_id, start, end) as any;

  const coverRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM cover_charge WHERE establishment_id = ? AND date(created_at) BETWEEN ? AND ? AND type = 'entry'`)
    .get(req.user!.establishment_id, start, end) as any;

  const barRevenue = db.prepare(`SELECT COALESCE(SUM(price),0) as total FROM bar_tokens WHERE establishment_id = ? AND date(created_at) BETWEEN ? AND ?`)
    .get(req.user!.establishment_id, start, end) as any;

  const ticketRevenue = db.prepare(`SELECT COALESCE(SUM(ts.total),0) as total FROM ticket_sales ts JOIN events e ON ts.event_id = e.id WHERE e.establishment_id = ? AND date(ts.created_at) BETWEEN ? AND ?`)
    .get(req.user!.establishment_id, start, end) as any;

  const inventoryCost = db.prepare(`SELECT COALESCE(SUM(i.cost_price * m.quantity),0) as total FROM inventory_movements m JOIN inventory_items i ON m.item_id = i.id WHERE i.establishment_id = ? AND m.type = 'out' AND date(m.created_at) BETWEEN ? AND ?`)
    .get(req.user!.establishment_id, start, end) as any;

  const totalRevenue = (grossRevenue?.total || 0) + (coverRevenue?.total || 0) + (barRevenue?.total || 0) + (ticketRevenue?.total || 0);

  res.json({
    period: { start, end },
    revenue: {
      gross: grossRevenue?.total || 0,
      cover: coverRevenue?.total || 0,
      bar: barRevenue?.total || 0,
      tickets: ticketRevenue?.total || 0,
      total: totalRevenue,
    },
    costs: {
      inventory: inventoryCost?.total || 0,
      estimated_taxes: totalRevenue * 0.08,
    },
    net: totalRevenue - (inventoryCost?.total || 0) - (totalRevenue * 0.08),
  });
});

// === Sales by Product ===
router.get('/top-products', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { start_date, end_date, limit = 10 } = req.query;
  const today = new Date().toISOString().split('T')[0];
  const start = start_date || today;
  const end = end_date || today;

  const barTokens = db.prepare(`SELECT item_name, COUNT(*) as sold, SUM(price) as revenue FROM bar_tokens WHERE establishment_id = ? AND date(created_at) BETWEEN ? AND ? GROUP BY item_name ORDER BY sold DESC LIMIT ?`)
    .all(req.user!.establishment_id, start, end, Number(limit));

  const tableItems = db.prepare(`SELECT product_name, SUM(quantity) as sold, SUM(quantity * price) as revenue FROM table_order_items loi JOIN table_orders lo ON loi.table_order_id = lo.id WHERE lo.establishment_id = ? AND date(lo.created_at) BETWEEN ? AND ? AND loi.status != 'cancelled' GROUP BY product_name ORDER BY sold DESC LIMIT ?`)
    .all(req.user!.establishment_id, start, end, Number(limit));

  res.json({ bar_tokens: barTokens, table_products: tableItems });
});

export default router;

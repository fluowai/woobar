import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { getPrinterConfig, queuePrint } from '../services/printing/service.js';

const router = Router();

function hashToken(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
function authenticateAgent(req: Request, res: Response) {
  const token = String(req.headers['x-print-agent-token'] || '');
  if (!token) { res.status(401).json({ error: 'Token do agente nao fornecido' }); return null; }
  const agent = db.prepare('SELECT * FROM printer_agents WHERE token_hash = ? AND active = 1').get(hashToken(token)) as any;
  if (!agent) { res.status(401).json({ error: 'Agente de impressao nao autorizado' }); return null; }
  db.prepare("UPDATE printer_agents SET last_seen_at = datetime('now') WHERE establishment_id = ?").run(agent.establishment_id);
  return agent;
}

router.get('/agent/next', (req: Request, res: Response) => {
  const agent = authenticateAgent(req, res); if (!agent) return;
  const claim = db.transaction(() => {
    const job = db.prepare("SELECT * FROM print_jobs WHERE establishment_id = ? AND status = 'pending' ORDER BY created_at LIMIT 1").get(agent.establishment_id) as any;
    if (!job) return null;
    db.prepare("UPDATE print_jobs SET status = 'printing', attempts = attempts + 1 WHERE id = ? AND status = 'pending'").run(job.id);
    return { ...job, status: 'printing', payload: JSON.parse(job.payload_json) };
  });
  res.json({ job: claim() });
});

router.post('/agent/jobs/:id/complete', (req: Request, res: Response) => {
  const agent = authenticateAgent(req, res); if (!agent) return;
  const status = req.body.success ? 'printed' : 'failed';
  const result = db.prepare("UPDATE print_jobs SET status = ?, error = ?, printed_at = CASE WHEN ? = 'printed' THEN datetime('now') ELSE printed_at END WHERE id = ? AND establishment_id = ?")
    .run(status, req.body.error || null, status, req.params.id, agent.establishment_id);
  if (!result.changes) { res.status(404).json({ error: 'Trabalho nao encontrado' }); return; }
  res.json({ success: true });
});

router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const config = getPrinterConfig(req.user!.establishment_id) || { name: 'Impressora principal', host: '', port: 9100, paper_width: 80, auto_print_tokens: 1, auto_print_tickets: 1, enabled: 0, delivery_mode: 'agent' };
  const agent = db.prepare('SELECT name, active, last_seen_at, created_at FROM printer_agents WHERE establishment_id = ?').get(req.user!.establishment_id) || null;
  const jobs = db.prepare('SELECT id, type, reference_id, status, attempts, error, created_at, printed_at FROM print_jobs WHERE establishment_id = ? ORDER BY created_at DESC LIMIT 30').all(req.user!.establishment_id);
  res.json({ config, agent, jobs });
});

router.put('/config', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { name = 'Impressora principal', host = '', port = 9100, paper_width = 80, auto_print_tokens = true, auto_print_tickets = true, enabled = false, delivery_mode = 'agent' } = req.body;
  if (host && !/^[a-zA-Z0-9.-]+$/.test(host)) { res.status(400).json({ error: 'IP ou host invalido' }); return; }
  if (![58, 80].includes(Number(paper_width)) || Number(port) < 1 || Number(port) > 65535) { res.status(400).json({ error: 'Porta ou largura de papel invalida' }); return; }
  if (!['agent', 'direct'].includes(delivery_mode)) { res.status(400).json({ error: 'Modo de impressao invalido' }); return; }
  db.prepare(`INSERT INTO printer_configs (establishment_id, name, host, port, paper_width, auto_print_tokens, auto_print_tickets, enabled, delivery_mode, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,datetime('now')) ON CONFLICT(establishment_id) DO UPDATE SET name=excluded.name, host=excluded.host, port=excluded.port,
    paper_width=excluded.paper_width, auto_print_tokens=excluded.auto_print_tokens, auto_print_tickets=excluded.auto_print_tickets, enabled=excluded.enabled, delivery_mode=excluded.delivery_mode, updated_at=datetime('now')`)
    .run(req.user!.establishment_id, name, host, Number(port), Number(paper_width), auto_print_tokens ? 1 : 0, auto_print_tickets ? 1 : 0, enabled ? 1 : 0, delivery_mode);
  res.json({ success: true });
});

router.post('/test', roleGuard('admin', 'manager'), async (req: Request, res: Response) => {
  const establishment = db.prepare('SELECT name FROM establishments WHERE id = ?').get(req.user!.establishment_id) as any;
  const result = await queuePrint(req.user!.establishment_id, 'test', null, { establishment: establishment?.name || 'Woobar', title: 'TESTE DE IMPRESSAO', lines: [{ label: 'Conexao realizada com sucesso' }, { label: new Date().toLocaleString('pt-BR') }], footer: 'Impressora configurada.' });
  res.status(result.status === 'failed' ? 502 : 200).json(result);
});

router.post('/agent/pair', roleGuard('admin'), (req: Request, res: Response) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO printer_agents (establishment_id, name, token_hash, active, created_at)
    VALUES (?,?,?,1,datetime('now')) ON CONFLICT(establishment_id) DO UPDATE SET name=excluded.name, token_hash=excluded.token_hash, active=1, last_seen_at=NULL, created_at=datetime('now')`)
    .run(req.user!.establishment_id, String(req.body.name || 'Agente local').slice(0, 80), hashToken(token));
  res.json({ token });
});

router.post('/jobs/:id/retry', roleGuard('admin', 'manager'), async (req: Request, res: Response) => {
  const job = db.prepare('SELECT * FROM print_jobs WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!job) { res.status(404).json({ error: 'Trabalho nao encontrado' }); return; }
  const result = await queuePrint(req.user!.establishment_id, job.type, job.reference_id, JSON.parse(job.payload_json));
  res.status(result.status === 'failed' ? 502 : 200).json(result);
});

router.post('/token/:code', async (req: Request, res: Response) => {
  const token = db.prepare('SELECT * FROM bar_tokens WHERE code = ? AND establishment_id = ?').get(req.params.code, req.user!.establishment_id) as any;
  if (!token) { res.status(404).json({ error: 'Ficha nao encontrada' }); return; }
  const establishment = db.prepare('SELECT name FROM establishments WHERE id = ?').get(req.user!.establishment_id) as any;
  const result = await queuePrint(req.user!.establishment_id, 'token', token.id, { establishment: establishment?.name || 'Woobar', title: token.type === 'ticket' ? 'FICHA DE CONSUMO' : 'FICHA DE BAR', subtitle: token.item_name, code: token.code, qrValue: token.code, lines: [{ label: 'Valor', value: `R$ ${Number(token.price).toFixed(2)}` }, { label: 'Status', value: token.status === 'valid' ? 'VALIDA' : 'UTILIZADA' }] });
  res.status(result.status === 'failed' ? 502 : 200).json(result);
});

router.post('/ticket/:code', async (req: Request, res: Response) => {
  const ticket = db.prepare(`SELECT ts.*, est.name establishment_name, e.title event_title, et.name ticket_name FROM ticket_sales ts
    JOIN events e ON e.id = ts.event_id JOIN establishments est ON est.id = e.establishment_id JOIN event_tickets et ON et.id = ts.ticket_type_id
    WHERE ts.code = ? AND e.establishment_id = ?`).get(req.params.code, req.user!.establishment_id) as any;
  if (!ticket) { res.status(404).json({ error: 'Ingresso nao encontrado' }); return; }
  const result = await queuePrint(req.user!.establishment_id, 'event_ticket', ticket.id, { establishment: ticket.establishment_name || 'Woobar', title: ticket.event_title, subtitle: ticket.ticket_name, code: ticket.code, qrValue: ticket.code, lines: [{ label: 'Quantidade', value: String(ticket.quantity) }, { label: 'Total', value: `R$ ${Number(ticket.total).toFixed(2)}` }, { label: 'Comprador', value: ticket.buyer_name || 'Nao informado' }] });
  res.status(result.status === 'failed' ? 502 : 200).json(result);
});

export default router;

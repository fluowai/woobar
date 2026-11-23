import { Router, Request, Response } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import * as waha from '../services/waha.js';
import db from '../db/schema.js';

const router = Router();
router.use(authMiddleware);
const manager = ['admin', 'manager'];
// Quem pode ver/conversar (atendimento) vs quem gerencia a sessão (admin/gerente)
const STAFF = ['admin', 'manager', 'waiter', 'attendant'];

router.get('/connections', roleGuard(...manager), (req: Request, res: Response) => res.json(waha.listConnections(req.user!.establishment_id)));
router.post('/connections', roleGuard(...manager), async (req: Request, res: Response) => {
  const { display_name, session_name, base_url, api_key, category_id } = req.body || {};
  if (!display_name?.trim() || !session_name?.trim() || !base_url?.trim()) { res.status(400).json({ error: 'Nome da conexão, nome da instância e URL do WAHA são obrigatórios' }); return; }
  try { const id = waha.createConnection(req.user!.establishment_id, { display_name, session_name, base_url, api_key, category_id }); const data = await waha.sessionAction(req.user!.establishment_id, id, 'start'); res.status(201).json({ id, session: data }); } catch (err: any) { res.status(400).json({ error: err.message }); }
});
router.patch('/connections/:id', roleGuard(...manager), (req: Request, res: Response) => { try { waha.updateConnection(req.user!.establishment_id, req.params.id, req.body); res.json({ success: true }); } catch (err: any) { res.status(400).json({ error: err.message }); } });
router.delete('/connections/:id', roleGuard(...manager), async (req: Request, res: Response) => { try { await waha.sessionAction(req.user!.establishment_id, req.params.id, 'logout').catch(() => undefined); db.prepare('DELETE FROM whatsapp_connections WHERE id = ? AND establishment_id = ?').run(req.params.id, req.user!.establishment_id); res.json({ success: true }); } catch (err: any) { res.status(400).json({ error: err.message }); } });
router.get('/connections/:id/status', roleGuard(...manager), async (req: Request, res: Response) => { try { res.json(await waha.getSession(req.user!.establishment_id, req.params.id)); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.get('/connections/:id/qr', roleGuard(...manager), async (req: Request, res: Response) => { try { res.json(await waha.getQr(req.user!.establishment_id, req.params.id)); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.post('/connections/:id/:action(start|stop|restart)', roleGuard(...manager), async (req: Request, res: Response) => { try { res.json(await waha.sessionAction(req.user!.establishment_id, req.params.id, req.params.action as any)); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.get('/connections/:id/catalog', roleGuard(...STAFF), (req: Request, res: Response) => { try { res.json(waha.getCatalogContext(req.user!.establishment_id, req.params.id)); } catch (err: any) { res.status(400).json({ error: err.message }); } });

router.get('/connections/:id/chats', roleGuard(...STAFF), async (req: Request, res: Response) => { try { res.json(await waha.listChats(req.user!.establishment_id, req.params.id)); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.get('/connections/:id/chats/:chatId/messages', roleGuard(...STAFF), async (req: Request, res: Response) => { try { res.json(await waha.listMessages(req.user!.establishment_id, req.params.id, decodeURIComponent(req.params.chatId), Number(req.query.limit) || 100)); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.post('/connections/:id/send', roleGuard(...STAFF), async (req: Request, res: Response) => { const { chatId, text, type, media } = req.body || {}; if (!chatId || (type === 'text' && (!text || text.length > 4096))) { res.status(400).json({ error: 'chatId e conteúdo válido são obrigatórios' }); return; } try { res.json(await waha.sendMessage(req.user!.establishment_id, req.params.id, chatId, { text, type, media })); } catch (err: any) { res.status(502).json({ error: err.message }); } });
router.patch('/connections/:id/contacts/:phone', roleGuard(...['admin', 'manager']), (req: Request, res: Response) => { try { waha.updateContactName(req.user!.establishment_id, req.params.id, req.params.phone, String(req.body?.display_name || '')); res.json({ success: true }); } catch (err: any) { res.status(400).json({ error: err.message }); } });
router.get('/connections/:id/contacts', roleGuard(...STAFF), (req: Request, res: Response) => { try { res.json(waha.listContacts(req.user!.establishment_id, req.params.id)); } catch (err: any) { res.status(400).json({ error: err.message }); } });

// WAHA envia eventos sem JWT; a conexão é autenticada por segredo próprio.
router.post('/waha/webhook/:id', async (req: Request, res: Response) => { const c = waha.connectionForWebhook(req.params.id); if (!c || !waha.verifyWebhook(c, req.header('x-webhook-secret') || req.header('x-waha-secret'))) { res.status(401).json({ error: 'Webhook não autorizado' }); return; } try { const message = waha.persistWebhookMessage(c.establishment_id, c.id, req.body); if (message) (globalThis as any).broadcastWS?.({ type: 'waha_message', connectionId: c.id, message }, c.establishment_id); res.status(200).json({ received: true }); } catch (err: any) { res.status(400).json({ error: err.message }); } });

export default router;

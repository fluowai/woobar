import { Router, Request, Response } from 'express';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import * as wa from '../services/baileys/whatsapp.js';

const router = Router();
router.use(authMiddleware);

// Quem pode ver/conversar (atendimento) vs quem gerencia a sessão (admin/gerente)
const STAFF = ['admin', 'manager', 'waiter', 'attendant'];

router.get('/status', roleGuard(...STAFF), (_req: Request, res: Response) => {
  res.json(wa.getStatus());
});

router.get('/qr', roleGuard('admin', 'manager'), (_req: Request, res: Response) => {
  const qr = wa.getQR();
  if (qr) {
    res.json({ qr, status: wa.getStatus().status });
  } else {
    res.json({ qr: null, status: wa.getStatus().status });
  }
});

router.post('/connect', roleGuard('admin', 'manager'), async (_req: Request, res: Response) => {
  const status = wa.getStatus();
  if (status.status === 'connected') {
    res.json({ message: 'Já conectado', status });
    return;
  }
  await wa.connect();
  res.json({ message: 'Conectando...', status: wa.getStatus() });
});

router.post('/disconnect', roleGuard('admin', 'manager'), async (_req: Request, res: Response) => {
  await wa.disconnect();
  res.json({ message: 'Desconectado' });
});

router.post('/reset', roleGuard('admin'), async (_req: Request, res: Response) => {
  await wa.resetSession();
  res.json({ message: 'Sessão resetada. Escaneie o QR code novamente.' });
});

router.get('/chats', roleGuard(...STAFF), (_req: Request, res: Response) => {
  const chats = wa.getChats();
  res.json(chats);
});

router.get('/chats/:jid/messages', roleGuard(...STAFF), async (req: Request, res: Response) => {
  const { jid } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  const decodedJid = decodeURIComponent(jid);
  const msgs = await wa.getMessages(decodedJid, limit);
  res.json(msgs);
});

router.post('/send', roleGuard(...STAFF), async (req: Request, res: Response) => {
  const { jid, text } = req.body;
  if (!jid || !text) {
    res.status(400).json({ error: 'jid e text são obrigatórios' });
    return;
  }
  if (typeof text !== 'string' || text.length > 4096) {
    res.status(400).json({ error: 'Mensagem inválida' });
    return;
  }
  const success = await wa.sendMessage(jid, text);
  if (success) {
    res.json({ success: true });
  } else {
    res.status(500).json({ error: 'Falha ao enviar mensagem' });
  }
});

export default router;

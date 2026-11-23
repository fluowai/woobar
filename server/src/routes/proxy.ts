import { Router, Request, Response } from 'express';
import { env } from '../lib/env.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { logger } from '../lib/logger.js';
import { getCatalogContext } from '../services/waha.js';

const router = Router();
router.use(authMiddleware);

router.post('/gemini', roleGuard('admin', 'manager'), async (req: Request, res: Response) => {
  try {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(400).json({ error: 'Gemini API key não configurada no servidor' });
      return;
    }

    const { contents, systemInstruction, connectionId } = req.body;
    if (!contents) {
      res.status(400).json({ error: 'Campo contents é obrigatório' });
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    let upstream: globalThis.Response;
    const catalog = connectionId ? getCatalogContext(req.user!.establishment_id, connectionId) : null;
    const enrichedInstruction = catalog
      ? `${systemInstruction || ''}\n\nCATÁLOGO AUTORIZADO DO ESTABELECIMENTO (use apenas estes produtos e preços):\n${JSON.stringify(catalog.products)}`
      : systemInstruction;
    try {
      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, systemInstruction: enrichedInstruction }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      const errorText = await upstream.text();
      logger.error('Gemini API error', { status: upstream.status, error: errorText.slice(0, 500) });
      res.status(upstream.status).json({ error: 'Erro na requisição à API Gemini' });
      return;
    }

    const data = await upstream.json();
    res.json(data);
  } catch (err: any) {
    logger.error('Gemini proxy error', { error: err.message });
    res.status(500).json({ error: 'Erro interno ao chamar Gemini' });
  }
});

export default router;

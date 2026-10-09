import http from 'http';
import { WebSocketServer } from 'ws';
import { URL } from 'url';
import app from './app.js';
import db from './db/schema.js';
import { scheduleBackups } from './db/backup.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';
import jwt from 'jsonwebtoken';

import { initializeChannelServices, stopAllChannelServices } from './services/orchestrator.js';

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 1024 * 100 });
app.set('wss', wss);

// WebSocket - authenticated real-time updates
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const tokenParam = url.searchParams.get('token');
  const authHeader = req.headers.authorization;
  let token: string | null = null;

  if (tokenParam) token = tokenParam;
  else if (authHeader?.startsWith('Bearer ')) token = authHeader.slice(7);

  if (!token) {
    ws.close(4001, 'Token não fornecido');
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    (ws as any).user = decoded;
    logger.info('Cliente WebSocket conectado', { userId: decoded.id, role: decoded.role });
    ws.send(JSON.stringify({ type: 'connected', message: 'Conectado ao Woobar Server' }));

    ws.on('close', () => {
      logger.info('Cliente WebSocket desconectado', { userId: decoded.id });
    });
  } catch {
    ws.close(4001, 'Token inválido ou expirado');
  }
});

// Broadcast helper — SEMPRE restrito ao estabelecimento (nenhum broadcast global)
(globalThis as any).broadcastWS = (data: any, establishmentId?: string) => {
  if (!establishmentId) {
    logger.warn('broadcastWS sem establishmentId — ignorado', { type: data?.type });
    return;
  }
  const msg = JSON.stringify(data);
  wss.clients.forEach((client: any) => {
    if (client.readyState === 1 && client.user?.establishment_id === establishmentId) {
      client.send(msg);
    }
  });
};

server.listen(env.PORT, '0.0.0.0', () => {
  logger.info(`Woobar Server rodando em http://localhost:${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`WebSocket em ws://localhost:${env.PORT}/ws`);

  initializeChannelServices();
  scheduleBackups();
});

let shuttingDown = false;
const shutdown = (signal: string) => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} recebido — encerrando servidor com segurança`);
  stopAllChannelServices();
  server.close(() => {
    wss.close();
    try { db.close(); } catch {}
    logger.info('Servidor encerrado');
    process.exit(0);
  });
  setTimeout(() => {
    logger.warn('Timeout de encerramento atingido — forçando saída');
    process.exit(1);
  }, 10000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export default app;

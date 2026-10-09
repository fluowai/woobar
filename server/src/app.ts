import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/schema.js';
import db from './db/schema.js';
import { env } from './lib/env.js';
import { logger } from './lib/logger.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import tableRoutes from './routes/tables.js';
import tokenRoutes from './routes/tokens.js';
import eventRoutes from './routes/events.js';
import coverRoutes from './routes/cover.js';
import inventoryRoutes from './routes/inventory.js';
import financialRoutes from './routes/financial.js';
import customerRoutes from './routes/customers.js';
import channelRoutes, { webhookRouter } from './routes/channels.js';
import establishmentRoutes from './routes/establishments.js';
import proxyRoutes from './routes/proxy.js';
import marketingRoutes from './routes/marketing.js';
import kioskRoutes from './routes/kiosk.js';
import printingRoutes from './routes/printing.js';
import whatsappRoutes from './routes/whatsapp.js';
import fiscalRoutes from './routes/fiscal.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const isProduction = env.NODE_ENV === 'production';

// Trust proxy for correct IP behind reverse proxies
app.set('trust proxy', 1);

// Initialize database
initDatabase();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://maps.googleapis.com', 'https://maps.gstatic.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      imgSrc: [
        "'self'", 'data:', 'blob:',
        'https://images.unsplash.com',
        'https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com',
        'https://*.openstreetmap.org', 'https://tile.openstreetmap.org',
        'https://unpkg.com', 'https://cdnjs.cloudflare.com', 'https://raw.githubusercontent.com',
        'https://i.pravatar.cc',
      ],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com', 'data:'],
      connectSrc: ["'self'", 'wss:', 'ws:', 'https://*.googleapis.com', 'https://*.google.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: isProduction ? [] : null,
    },
  },
  strictTransportSecurity: isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use(compression());
app.use(cors({
  origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',').map(s => s.trim()) : (isProduction ? (() => { throw new Error('CORS_ORIGIN must be set in production'); })() : ['http://localhost:3000']),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em alguns minutos.' },
});
app.use('/api/', limiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login em 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/refresh', authLimiter);

app.use(express.json({
  limit: '500kb',
  verify: (req, _res, buf) => {
    (req as any).rawBody = buf;
  },
}));

// Request logging (without exposing sensitive data)
app.use((req, _res, next) => {
  if (req.path !== '/api/health') {
    logger.info(`${req.method} ${req.path}`, { ip: req.ip });
  }
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/printing', printingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/cover', coverRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/fiscal', fiscalRoutes);
// Webhooks must be mounted BEFORE channelRoutes: otherwise channelRoutes'
// router.use(authMiddleware) intercepts external platform callbacks with 401.
app.use('/api/channels/webhook', webhookRouter);
app.use('/api/channels', channelRoutes);
app.use('/api/establishments', establishmentRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// Health check — valida também o banco (o healthcheck do compose precisa
// ficar vermelho se o SQLite estiver inutilizável)
app.get('/api/health', (_req, res) => {
  const wss = app.get('wss');
  let dbOk = true;
  try {
    db.prepare('SELECT 1').get();
  } catch {
    dbOk = false;
  }
  res.status(dbOk ? 200 : 503).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk,
    timestamp: new Date().toISOString(),
    clients: wss?.clients?.size ?? 0,
  });
});

// Unknown API routes must answer JSON (never HTML) so the frontend can show a clear error
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Uploaded files - with basic protection
const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const uploadsStatic = express.static(uploadsDir);
app.use('/uploads', (req, res, next) => {
  const ext = path.extname(req.path).toLowerCase();
  const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  if (req.path !== '/' && !allowed.includes(ext)) {
    res.status(403).json({ error: 'Tipo de arquivo não permitido' });
    return;
  }
  uploadsStatic(req, res, next);
});

// Serve frontend in production
if (isProduction) {
  const distPath = path.resolve(__dirname, 'public');
  if (fs.existsSync(distPath)) {
    logger.info('Servindo frontend buildado de:', { path: distPath });
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    logger.warn('Diretório public/ não encontrado. Frontend não será servido. Execute npm run build primeiro.');
  }
}

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'JSON inválido no corpo da requisição' });
    return;
  }
  const status = err?.status || err?.statusCode;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: err?.expose ? err.message : 'Requisição inválida' });
    return;
  }
  logger.error('Erro não tratado', { error: err.message, stack: isProduction ? undefined : err.stack });
  res.status(500).json({ error: 'Erro interno do servidor' });
});

export default app;

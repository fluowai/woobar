import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { env } from '../lib/env.js';
import { z } from 'zod';
import { validate } from '../lib/validate.js';

const router = Router();

// ==========================================
// 1. ENDPOINTS PÚBLICOS (Auto-Onboarding & Planos)
// ==========================================

router.get('/plans', (_req: Request, res: Response) => {
  const plans = db.prepare('SELECT * FROM saas_plans WHERE active = 1 ORDER BY price_monthly ASC').all() as any[];
  const formatted = plans.map(p => ({
    ...p,
    features: JSON.parse(p.features_json || '[]')
  }));
  res.json(formatted);
});

const publicRegisterSchema = z.object({
  establishment_name: z.string().min(2, 'Nome do estabelecimento é obrigatório'),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  owner_name: z.string().min(2, 'Nome do responsável é obrigatório'),
  owner_email: z.string().email('E-mail válido é obrigatório'),
  password: z.string().min(8, 'Senha deve ter no mínimo 8 caracteres').regex(/[A-Za-z]/, 'Senha deve conter pelo menos uma letra').regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  phone: z.string().optional(),
  plan_slug: z.string().default('pro'),
});

router.post('/register', validate(publicRegisterSchema), (req: Request, res: Response) => {
  const { establishment_name, slug, owner_name, owner_email, password, phone, plan_slug } = req.body;

  const existingSlug = db.prepare('SELECT id FROM establishments WHERE slug = ?').get(slug);
  if (existingSlug) {
    res.status(400).json({ error: 'Este identificador (slug) já está em uso por outro estabelecimento' });
    return;
  }

  const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(owner_email);
  if (existingUser) {
    res.status(400).json({ error: 'Este e-mail já está cadastrado no sistema' });
    return;
  }

  const plan = db.prepare('SELECT id FROM saas_plans WHERE slug = ? AND active = 1').get(plan_slug) as any;
  if (!plan) {
    res.status(400).json({ error: 'Plano selecionado inválido' });
    return;
  }

  const establishmentId = uuid();
  const userId = uuid();
  const subId = uuid();
  const passwordHash = bcrypt.hashSync(password, 10);
  const trialDays = 14;

  db.transaction(() => {
    // 1. Cria o estabelecimento
    db.prepare(`
      INSERT INTO establishments (id, name, slug, phone, active)
      VALUES (?, ?, ?, ?, 1)
    `).run(establishmentId, establishment_name, slug, phone || '');

    // 2. Configurações padrão da loja
    db.prepare(`
      INSERT INTO establishment_settings (establishment_id, name)
      VALUES (?, ?)
    `).run(establishmentId, establishment_name);

    // 3. Cria o usuário Admin proprietário da conta
    db.prepare(`
      INSERT INTO users (id, establishment_id, name, email, password_hash, role, status)
      VALUES (?, ?, ?, ?, ?, 'admin', 'active')
    `).run(userId, establishmentId, owner_name, owner_email, passwordHash);

    // 4. Cria a assinatura no período de Trial de 14 dias
    db.prepare(`
      INSERT INTO saas_subscriptions (id, establishment_id, plan_id, status, trial_ends_at, current_period_end, billing_cycle)
      VALUES (?, ?, ?, 'trial', datetime('now', '+${trialDays} days'), datetime('now', '+${trialDays} days'), 'monthly')
    `).run(subId, establishmentId, plan.id);

    // 5. Categorias e mesas de exemplo para o novo lojista não começar vazio
    const catId = uuid();
    db.prepare('INSERT INTO categories (id, establishment_id, name, sort_order) VALUES (?, ?, ?, 1)')
      .run(catId, establishmentId, 'Bebidas');

    for (let i = 1; i <= 5; i++) {
      db.prepare('INSERT INTO tables (id, establishment_id, name, seats, status) VALUES (?, ?, ?, 4, ?)')
        .run(uuid(), establishmentId, `Mesa 0${i}`, 'free');
    }
  })();

  const token = jwt.sign(
    { id: userId, email: owner_email, role: 'admin', establishment_id: establishmentId, name: owner_name },
    env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({
    success: true,
    message: 'Conta criada com sucesso! 14 dias de teste liberados.',
    token,
    user: { id: userId, name: owner_name, email: owner_email, role: 'admin', establishment_id: establishmentId }
  });
});

// ==========================================
// 2. ENDPOINTS MASTER (Apenas Super Admin)
// ==========================================

router.use(authMiddleware);
router.use(roleGuard('superadmin'));

router.get('/metrics', (_req: Request, res: Response) => {
  const totalTenants = (db.prepare('SELECT COUNT(*) as count FROM establishments').get() as any)?.count || 0;
  const activeTenants = (db.prepare("SELECT COUNT(*) as count FROM saas_subscriptions WHERE status = 'active'").get() as any)?.count || 0;
  const trialTenants = (db.prepare("SELECT COUNT(*) as count FROM saas_subscriptions WHERE status = 'trial'").get() as any)?.count || 0;
  const pastDueTenants = (db.prepare("SELECT COUNT(*) as count FROM saas_subscriptions WHERE status IN ('past_due', 'canceled')").get() as any)?.count || 0;

  const mrrRow = db.prepare(`
    SELECT COALESCE(SUM(p.price_monthly), 0) as mrr
    FROM saas_subscriptions s
    JOIN saas_plans p ON s.plan_id = p.id
    WHERE s.status = 'active'
  `).get() as any;

  const gmvRow = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as gmv
    FROM orders
    WHERE status != 'cancelled' AND date(created_at) >= date('now', '-30 days')
  `).get() as any;

  res.json({
    total_tenants: totalTenants,
    active_tenants: activeTenants,
    trial_tenants: trialTenants,
    past_due_tenants: pastDueTenants,
    mrr: mrrRow?.mrr || 0,
    gmv_last_30_days: gmvRow?.gmv || 0,
  });
});

router.get('/tenants', (_req: Request, res: Response) => {
  const tenants = db.prepare(`
    SELECT 
      e.id, e.name, e.slug, e.phone, e.address, e.active, e.created_at,
      s.status as subscription_status, s.trial_ends_at, s.current_period_end, s.billing_cycle,
      p.id as plan_id, p.name as plan_name, p.slug as plan_slug, p.price_monthly,
      (SELECT COUNT(*) FROM users u WHERE u.establishment_id = e.id) as user_count,
      (SELECT COUNT(*) FROM tables t WHERE t.establishment_id = e.id) as table_count,
      (SELECT COUNT(*) FROM products pr WHERE pr.establishment_id = e.id) as product_count,
      (SELECT COUNT(*) FROM orders o WHERE o.establishment_id = e.id) as order_count,
      (SELECT email FROM users u WHERE u.establishment_id = e.id AND u.role = 'admin' LIMIT 1) as admin_email,
      (SELECT name FROM users u WHERE u.establishment_id = e.id AND u.role = 'admin' LIMIT 1) as admin_name
    FROM establishments e
    LEFT JOIN saas_subscriptions s ON e.id = s.establishment_id
    LEFT JOIN saas_plans p ON s.plan_id = p.id
    ORDER BY e.created_at DESC
  `).all();

  res.json(tenants);
});

router.post('/tenants', (req: Request, res: Response) => {
  const { name, slug, admin_name, admin_email, admin_password, plan_slug = 'pro', trial_days = 14 } = req.body;

  if (!name || !slug || !admin_email || !admin_password) {
    res.status(400).json({ error: 'Campos obrigatórios: name, slug, admin_email, admin_password' });
    return;
  }

  const existingSlug = db.prepare('SELECT id FROM establishments WHERE slug = ?').get(slug);
  if (existingSlug) {
    res.status(400).json({ error: 'Slug já em uso' });
    return;
  }

  const plan = db.prepare('SELECT id FROM saas_plans WHERE slug = ?').get(plan_slug) as any;
  if (!plan) {
    res.status(400).json({ error: 'Plano não encontrado' });
    return;
  }

  const estId = uuid();
  const userId = uuid();
  const subId = uuid();
  const passwordHash = bcrypt.hashSync(admin_password, 10);

  db.transaction(() => {
    db.prepare('INSERT INTO establishments (id, name, slug, active) VALUES (?, ?, ?, 1)').run(estId, name, slug);
    db.prepare('INSERT INTO establishment_settings (establishment_id, name) VALUES (?, ?)').run(estId, name);
    db.prepare("INSERT INTO users (id, establishment_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, 'admin', 'active')")
      .run(userId, estId, admin_name || name, admin_email, passwordHash);
    db.prepare(`
      INSERT INTO saas_subscriptions (id, establishment_id, plan_id, status, trial_ends_at, current_period_end, billing_cycle)
      VALUES (?, ?, ?, 'trial', datetime('now', '+${Number(trial_days)} days'), datetime('now', '+${Number(trial_days)} days'), 'monthly')
    `).run(subId, estId, plan.id);
  })();

  res.status(201).json({ success: true, id: estId, message: 'Novo estabelecimento provisionado com sucesso' });
});

router.patch('/tenants/:id/status', (req: Request, res: Response) => {
  const { active, subscription_status } = req.body;
  const est = db.prepare('SELECT id FROM establishments WHERE id = ?').get(req.params.id);
  if (!est) {
    res.status(404).json({ error: 'Estabelecimento não encontrado' });
    return;
  }

  db.transaction(() => {
    if (active !== undefined) {
      db.prepare('UPDATE establishments SET active = ? WHERE id = ?').run(active ? 1 : 0, req.params.id);
    }
    if (subscription_status) {
      db.prepare("UPDATE saas_subscriptions SET status = ?, updated_at = datetime('now') WHERE establishment_id = ?")
        .run(subscription_status, req.params.id);
    }
  })();

  res.json({ success: true, message: 'Status do estabelecimento atualizado' });
});

router.patch('/tenants/:id/plan', (req: Request, res: Response) => {
  const { plan_slug, status, extend_days } = req.body;
  const est = db.prepare('SELECT id FROM establishments WHERE id = ?').get(req.params.id);
  if (!est) {
    res.status(404).json({ error: 'Estabelecimento não encontrado' });
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  if (plan_slug) {
    const plan = db.prepare('SELECT id FROM saas_plans WHERE slug = ?').get(plan_slug) as any;
    if (!plan) { res.status(400).json({ error: 'Plano inválido' }); return; }
    updates.push('plan_id = ?');
    params.push(plan.id);
  }

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }

  if (extend_days && Number(extend_days) > 0) {
    updates.push(`current_period_end = datetime(COALESCE(current_period_end, 'now'), '+${Number(extend_days)} days')`);
    updates.push(`trial_ends_at = datetime(COALESCE(trial_ends_at, 'now'), '+${Number(extend_days)} days')`);
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE saas_subscriptions SET ${updates.join(', ')} WHERE establishment_id = ?`).run(...params);
  }

  res.json({ success: true, message: 'Assinatura atualizada com sucesso' });
});

router.post('/tenants/:id/impersonate', (req: Request, res: Response) => {
  const adminUser = db.prepare(`
    SELECT id, name, email, role, establishment_id
    FROM users
    WHERE establishment_id = ? AND role = 'admin'
    LIMIT 1
  `).get(req.params.id) as any;

  if (!adminUser) {
    res.status(404).json({ error: 'Nenhum usuário administrador encontrado para este estabelecimento' });
    return;
  }

  const token = jwt.sign(
    {
      id: adminUser.id,
      email: adminUser.email,
      role: 'admin',
      establishment_id: adminUser.establishment_id,
      name: adminUser.name,
      is_impersonated: true,
      impersonated_by: req.user!.id
    },
    env.JWT_SECRET,
    { expiresIn: '4h' }
  );

  res.json({
    success: true,
    token,
    user: adminUser,
    message: `Acessando como administrador de ${adminUser.name}`
  });
});

export default router;


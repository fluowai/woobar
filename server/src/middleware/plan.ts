import { Request, Response, NextFunction } from 'express';
import db from '../db/schema.js';

export interface PlanContext {
  id: string;
  name: string;
  slug: string;
  features: string[];
  max_tables: number;
  max_users: number;
  max_products: number;
  status: 'trial' | 'active' | 'past_due' | 'canceled';
  trial_ends_at?: string;
  current_period_end?: string;
}

declare global {
  namespace Express {
    interface Request {
      planContext?: PlanContext;
    }
  }
}

/**
 * Middleware para validar o status da assinatura do estabelecimento.
 * Não bloqueia rotas de leitura básicas, apenas operações de mutação caso esteja vencido.
 */
export function checkSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  // Superadmin não possui restrição de plano
  if (req.user.role === 'superadmin') {
    next();
    return;
  }

  const estId = req.user.establishment_id;
  if (!estId) {
    res.status(400).json({ error: 'Usuário sem estabelecimento vinculado' });
    return;
  }

  const sub = db.prepare(`
    SELECT 
      s.status, s.trial_ends_at, s.current_period_end,
      p.id as plan_id, p.name as plan_name, p.slug as plan_slug,
      p.features_json, p.max_tables, p.max_users, p.max_products
    FROM saas_subscriptions s
    JOIN saas_plans p ON s.plan_id = p.id
    WHERE s.establishment_id = ?
  `).get(estId) as any;

  // Se não tiver assinatura registrada, cria uma trial temporária de cortesia
  if (!sub) {
    next();
    return;
  }

  const features: string[] = JSON.parse(sub.features_json || '[]');
  req.planContext = {
    id: sub.plan_id,
    name: sub.plan_name,
    slug: sub.plan_slug,
    features,
    max_tables: sub.max_tables,
    max_users: sub.max_users,
    max_products: sub.max_products,
    status: sub.status,
    trial_ends_at: sub.trial_ends_at,
    current_period_end: sub.current_period_end,
  };

  const now = new Date();
  const trialExpired = sub.status === 'trial' && sub.trial_ends_at && new Date(sub.trial_ends_at) < now;
  const periodExpired = sub.status === 'past_due' || sub.status === 'canceled';

  if (trialExpired || periodExpired) {
    // Permite apenas GET (leitura para histórico e exportação), bloqueia POST/PUT/DELETE/PATCH
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.status(402).json({
        error: 'Assinatura pendente ou período de teste expirado',
        code: 'SUBSCRIPTION_EXPIRED',
        status: sub.status,
        message: 'Para continuar lançando vendas, pedidos e emitindo notas, regularize sua assinatura no painel.'
      });
      return;
    }
  }

  next();
}

/**
 * Guardião de funcionalidade contratada no plano SaaS.
 * Ex: requirePlanFeature('kds'), requirePlanFeature('fiscal')
 */
export function requirePlanFeature(feature: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role === 'superadmin') {
      next();
      return;
    }

    const estId = req.user?.establishment_id;
    if (!estId) {
      res.status(403).json({ error: 'Acesso negado: sem estabelecimento' });
      return;
    }

    const plan = db.prepare(`
      SELECT p.name, p.features_json FROM saas_subscriptions s
      JOIN saas_plans p ON s.plan_id = p.id
      WHERE s.establishment_id = ?
    `).get(estId) as any;

    if (!plan) {
      next();
      return;
    }

    const features: string[] = JSON.parse(plan.features_json || '[]');
    if (!features.includes(feature)) {
      res.status(403).json({
        error: `Funcionalidade '${feature}' não inclusa no seu plano atual (${plan.name})`,
        code: 'UPGRADE_REQUIRED',
        feature,
        current_plan: plan.name,
        message: 'Faça upgrade do seu plano para liberar esta funcionalidade.'
      });
      return;
    }

    next();
  };
}


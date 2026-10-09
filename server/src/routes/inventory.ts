import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';

const router = Router();
router.use(authMiddleware);

router.get('/', (req: Request, res: Response) => {
  const items = db.prepare('SELECT * FROM inventory_items WHERE establishment_id = ? AND active = 1 ORDER BY category, name').all(req.user!.establishment_id);
  const withAlerts = items.map((i: any) => ({
    ...i,
    alert: i.current_stock <= i.min_stock ? 'low' : 'ok',
  }));
  res.json(withAlerts);
});

router.get('/alerts', (req: Request, res: Response) => {
  const alerts = db.prepare('SELECT * FROM inventory_items WHERE establishment_id = ? AND active = 1 AND current_stock <= min_stock ORDER BY (current_stock - min_stock) ASC').all(req.user!.establishment_id);
  res.json(alerts);
});

router.post('/', roleGuard('admin', 'manager'), validate(schemas.inventoryItem), (req: Request, res: Response) => {
  const { name, unit, current_stock, min_stock, cost_price, category } = req.body;
  const id = uuid();
  db.prepare('INSERT INTO inventory_items (id, establishment_id, name, unit, current_stock, min_stock, cost_price, category) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, req.user!.establishment_id, name, unit, current_stock || 0, min_stock || 0, cost_price || 0, category);
  res.status(201).json({ id, name });
});

router.post('/movement', roleGuard('admin', 'manager', 'waiter', 'kitchen', 'pantry'), validate(schemas.addMovement), (req: Request, res: Response) => {
  const { item_id, type, quantity, unit_cost, reason } = req.body;
  // Item precisa pertencer ao estabelecimento do usuário (isolamento de tenant)
  const item = db.prepare('SELECT id, current_stock FROM inventory_items WHERE id = ? AND establishment_id = ?')
    .get(item_id, req.user!.establishment_id) as any;
  if (!item) { res.status(404).json({ error: 'Item não encontrado' }); return; }
  // Estoque nunca fica negativo
  if (type === 'out' && Number(item.current_stock) < Number(quantity)) {
    res.status(400).json({ error: 'Estoque insuficiente', available: item.current_stock });
    return;
  }
  const movId = uuid();
  const apply = db.transaction(() => {
    db.prepare('INSERT INTO inventory_movements (id, item_id, type, quantity, unit_cost, reason) VALUES (?,?,?,?,?,?)').run(movId, item_id, type, quantity, unit_cost, reason);
    const sign = type === 'in' ? '+' : '-';
    db.prepare(`UPDATE inventory_items SET current_stock = current_stock ${sign} ? WHERE id = ?`).run(quantity, item_id);
  });
  apply();
  res.status(201).json({ id: movId });
});

router.get('/movements/:item_id', (req: Request, res: Response) => {
  const item = db.prepare('SELECT id FROM inventory_items WHERE id = ? AND establishment_id = ?').get(req.params.item_id, req.user!.establishment_id);
  if (!item) { res.status(404).json({ error: 'Item não encontrado' }); return; }
  const movs = db.prepare('SELECT * FROM inventory_movements WHERE item_id = ? ORDER BY created_at DESC LIMIT 50').all(req.params.item_id);
  res.json(movs);
});

// === RECIPES ===

router.get('/recipes', (req: Request, res: Response) => {
  const recipes = db.prepare(`
    SELECT r.*, p.name as product_name FROM recipes r
    LEFT JOIN products p ON r.product_id = p.id
    WHERE r.establishment_id = ?
    ORDER BY r.name
  `).all(req.user!.establishment_id);
  const result = recipes.map((r: any) => {
    const ingredients = db.prepare(`
      SELECT ri.*, ii.name as ingredient_name, ii.unit as ingredient_unit FROM recipe_ingredients ri
      LEFT JOIN inventory_items ii ON ri.inventory_item_id = ii.id
      WHERE ri.recipe_id = ?
    `).all(r.id);
    return { ...r, ingredients };
  });
  res.json(result);
});

router.post('/recipes', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const { product_id, name, yield_amount, yield_unit, instructions, ingredients } = req.body;
  if (!name || typeof name !== 'string') { res.status(400).json({ error: 'Nome obrigatório' }); return; }
  if (product_id) {
    const prod = db.prepare('SELECT id FROM products WHERE id = ? AND establishment_id = ?').get(product_id, req.user!.establishment_id);
    if (!prod) { res.status(404).json({ error: 'Produto não encontrado' }); return; }
  }
  const recId = uuid();
  const txn = db.transaction(() => {
    db.prepare('INSERT INTO recipes (id, establishment_id, product_id, name, yield_amount, yield_unit, instructions) VALUES (?,?,?,?,?,?,?)')
      .run(recId, req.user!.establishment_id, product_id || null, name, yield_amount || 1, yield_unit || 'un', instructions);
    if (Array.isArray(ingredients)) {
      const ins = db.prepare('INSERT INTO recipe_ingredients (id, recipe_id, inventory_item_id, quantity, unit, notes) VALUES (?,?,?,?,?,?)');
      const owns = db.prepare('SELECT id FROM inventory_items WHERE id = ? AND establishment_id = ?');
      for (const ing of ingredients) {
        if (!owns.get(ing.inventory_item_id, req.user!.establishment_id)) continue;
        ins.run(uuid(), recId, ing.inventory_item_id, ing.quantity, ing.unit, ing.notes);
      }
    }
  });
  txn();
  res.status(201).json({ id: recId, name });
});

// Calculate cost of a recipe from its ingredients
router.get('/recipes/:id/cost', (req: Request, res: Response) => {
  const recipe = db.prepare('SELECT id FROM recipes WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id);
  if (!recipe) { res.status(404).json({ error: 'Receita não encontrada' }); return; }
  const ingredients = db.prepare(`
    SELECT ri.quantity, ri.unit, ii.cost_price, ii.name FROM recipe_ingredients ri
    JOIN inventory_items ii ON ri.inventory_item_id = ii.id
    WHERE ri.recipe_id = ?
  `).all(req.params.id) as any[];
  const totalCost = ingredients.reduce((acc, ing) => acc + (ing.quantity * (ing.cost_price || 0)), 0);
  res.json({ total_cost: totalCost, ingredients });
});

export default router;

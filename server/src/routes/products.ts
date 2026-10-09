import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db/schema.js';
import { authMiddleware, roleGuard } from '../middleware/auth.js';
import { validate, schemas } from '../lib/validate.js';
import { z } from 'zod';

const router = Router();
router.use(authMiddleware);

const updateProduct = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  category_id: z.string().optional(),
  image: z.string().optional(),
  active: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
});

router.get('/', (req: Request, res: Response) => {
  const products = db.prepare(`
    SELECT p.*, c.name as category_name FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.establishment_id = ? AND p.active = 1
    ORDER BY c.sort_order, p.name
  `).all(req.user!.establishment_id);
  res.json(products);
});

router.get('/categories', (req: Request, res: Response) => {
  const cats = db.prepare('SELECT * FROM categories WHERE establishment_id = ? ORDER BY sort_order').all(req.user!.establishment_id);
  res.json(cats);
});

router.post('/', roleGuard('admin', 'manager'), validate(schemas.createProduct), (req: Request, res: Response) => {
  const { name, description, price, category_id, image } = req.body;
  if (category_id) {
    const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND establishment_id = ?').get(category_id, req.user!.establishment_id);
    if (!cat) { res.status(400).json({ error: 'Categoria inválida' }); return; }
  }
  const id = uuid();
  db.prepare('INSERT INTO products (id, establishment_id, category_id, name, description, price, image) VALUES (?,?,?,?,?,?,?)')
    .run(id, req.user!.establishment_id, category_id || null, name, description, price, image || null);
  res.status(201).json({ id, name, price });
});

router.put('/:id', roleGuard('admin', 'manager'), validate(updateProduct), (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND establishment_id = ?').get(req.params.id, req.user!.establishment_id) as any;
  if (!existing) { res.status(404).json({ error: 'Produto não encontrado' }); return; }
  const merged = { ...existing, ...req.body };
  db.prepare('UPDATE products SET name=?, description=?, price=?, category_id=?, image=?, active=? WHERE id=? AND establishment_id=?')
    .run(merged.name, merged.description, merged.price, merged.category_id, merged.image, merged.active ? 1 : 0, req.params.id, req.user!.establishment_id);
  res.json({ success: true });
});

router.delete('/:id', roleGuard('admin', 'manager'), (req: Request, res: Response) => {
  const result = db.prepare('UPDATE products SET active = 0 WHERE id = ? AND establishment_id = ?').run(req.params.id, req.user!.establishment_id);
  if (result.changes === 0) { res.status(404).json({ error: 'Produto não encontrado' }); return; }
  res.json({ success: true });
});

export default router;

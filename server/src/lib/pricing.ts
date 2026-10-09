import db from '../db/schema.js';

/** Perfis autorizados a definir preço manual (fora do cardápio). */
export function canSetCustomPrice(role?: string): boolean {
  return role === 'superadmin' || role === 'admin' || role === 'manager';
}

/**
 * Resolve o produto real no cardápio do estabelecimento.
 * Aceita product_id (confiável) ou name (match exato, case-insensitive).
 * Retorna null se não encontrar — o preço NUNCA deve vir do cliente nesse caso.
 */
export function resolveProduct(establishmentId: string, productId?: string, name?: string) {
  if (productId) {
    const p = db.prepare(
      'SELECT id, name, price FROM products WHERE id = ? AND establishment_id = ? AND active = 1'
    ).get(String(productId), establishmentId) as any;
    if (p) return p;
  }
  if (name) {
    const p = db.prepare(
      'SELECT id, name, price FROM products WHERE establishment_id = ? AND active = 1 AND lower(name) = lower(?)'
    ).get(establishmentId, String(name)) as any;
    if (p) return p;
  }
  return null;
}

/**
 * Normaliza itens de pedido usando preços do servidor.
 * Itens não encontrados só são aceitos para papéis com permissão de preço manual.
 * Lança Error com mensagem quando inválido.
 */
export function normalizeOrderItems(
  establishmentId: string,
  items: any[],
  role?: string
): { product_id: string | null; name: string; price: number; quantity: number; notes?: string }[] {
  const allowCustom = canSetCustomPrice(role);
  const result = [];
  for (const item of items) {
    const quantity = Math.max(1, Math.min(999, Number(item.quantity) || 1));
    const product = resolveProduct(establishmentId, item.product_id, item.name);
    if (product) {
      result.push({
        product_id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity,
        ...(item.notes ? { notes: String(item.notes).slice(0, 200) } : {}),
      });
    } else if (allowCustom && Number(item.price) > 0) {
      result.push({
        product_id: null,
        name: String(item.name || 'Item').slice(0, 120),
        price: Number(item.price),
        quantity,
        ...(item.notes ? { notes: String(item.notes).slice(0, 200) } : {}),
      });
    } else {
      throw new Error(`Item inválido: ${item.name || item.product_id || 'sem nome'}`);
    }
  }
  return result;
}

export function orderTotal(items: { price: number; quantity: number }[]): number {
  return Math.round(items.reduce((sum, i) => sum + i.price * i.quantity, 0) * 100) / 100;
}

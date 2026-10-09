import { describe, it, expect, beforeAll } from 'vitest';
import { v4 as uuid } from 'uuid';
import db, { initDatabase } from '../src/db/schema.js';
import { canSetCustomPrice, normalizeOrderItems, orderTotal } from '../src/lib/pricing.js';
import { canAssignRole } from '../src/lib/roles.js';

const estId = uuid();
const otherEstId = uuid();
const product = { id: uuid(), name: 'Cerveja Artesanal', price: 24.9 };

beforeAll(() => {
  initDatabase();
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(estId, 'Bar Pricing', 'bar-pricing');
  db.prepare('INSERT INTO establishments (id, name, slug) VALUES (?,?,?)').run(otherEstId, 'Bar Outro', 'bar-outro');
  db.prepare('INSERT INTO products (id, establishment_id, name, price, active) VALUES (?,?,?,?,1)')
    .run(product.id, estId, product.name, product.price);
  db.prepare('INSERT INTO products (id, establishment_id, name, price, active) VALUES (?,?,?,?,0)')
    .run(uuid(), estId, 'Produto Inativo', 10);
});

describe('canSetCustomPrice', () => {
  it('admin e manager podem definir preço manual', () => {
    expect(canSetCustomPrice('admin')).toBe(true);
    expect(canSetCustomPrice('manager')).toBe(true);
    expect(canSetCustomPrice('superadmin')).toBe(true);
  });

  it('waiter e attendant NÃO podem', () => {
    expect(canSetCustomPrice('waiter')).toBe(false);
    expect(canSetCustomPrice('attendant')).toBe(false);
    expect(canSetCustomPrice(undefined)).toBe(false);
  });
});

describe('canAssignRole', () => {
  it('admin não pode atribuir superadmin', () => {
    expect(canAssignRole('admin', 'superadmin')).toBe(false);
  });

  it('superadmin pode atribuir superadmin', () => {
    expect(canAssignRole('superadmin', 'superadmin')).toBe(true);
  });

  it('admin pode atribuir papéis operacionais', () => {
    expect(canAssignRole('admin', 'waiter')).toBe(true);
    expect(canAssignRole('admin', 'manager')).toBe(true);
  });

  it('rejeita papéis desconhecidos', () => {
    expect(canAssignRole('superadmin', 'hacker')).toBe(false);
    expect(canAssignRole('admin', undefined)).toBe(false);
  });
});

describe('normalizeOrderItems', () => {
  it('usa o preço do servidor e ignora o preço enviado pelo cliente', () => {
    const items = normalizeOrderItems(estId, [
      { product_id: product.id, name: product.name, price: 0.01, quantity: 2 },
    ], 'waiter');
    expect(items).toHaveLength(1);
    expect(items[0].price).toBe(product.price);
    expect(orderTotal(items)).toBeCloseTo(49.8, 2);
  });

  it('resolve produto por nome (case-insensitive)', () => {
    const items = normalizeOrderItems(estId, [
      { name: 'cerveja artesanal', price: 1, quantity: 1 },
    ], 'waiter');
    expect(items[0].price).toBe(product.price);
  });

  it('preço manual (produto não encontrado) só para papéis autorizados', () => {
    expect(() => normalizeOrderItems(estId, [
      { name: 'Item Inexistente', price: 999, quantity: 1 },
    ], 'waiter')).toThrow(/Item inválido/);

    const adminItems = normalizeOrderItems(estId, [
      { name: 'Item Inexistente', price: 999, quantity: 1 },
    ], 'admin');
    expect(adminItems[0].price).toBe(999);
  });

  it('não resolve produto de outro estabelecimento', () => {
    expect(() => normalizeOrderItems(otherEstId, [
      { product_id: product.id, price: 1, quantity: 1 },
    ], 'waiter')).toThrow(/Item inválido/);
  });

  it('ignora produto inativo', () => {
    const inactive = db.prepare("SELECT id FROM products WHERE name = 'Produto Inativo'").get() as any;
    expect(() => normalizeOrderItems(estId, [
      { product_id: inactive.id, price: 1, quantity: 1 },
    ], 'waiter')).toThrow(/Item inválido/);
  });

  it('limita quantity entre 1 e 999', () => {
    const items = normalizeOrderItems(estId, [
      { product_id: product.id, quantity: 0 },
      { product_id: product.id, quantity: 5000 },
    ], 'waiter');
    expect(items[0].quantity).toBe(1);
    expect(items[1].quantity).toBe(999);
  });
});

describe('orderTotal', () => {
  it('soma e arredonda para 2 casas', () => {
    expect(orderTotal([{ price: 10.555, quantity: 1 }, { price: 0.1, quantity: 3 }])).toBe(10.86);
    expect(orderTotal([])).toBe(0);
  });
});

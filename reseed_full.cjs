
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('🔄 Re-seeding with correct woobar data...');
  
  try {
    // Clear existing data
    console.log('\n🧹 Clearing existing data...');
    await client.query('TRUNCATE TABLE sold_items, orders, cover_charge_transactions, events, chat_messages, courier_positions, tables, menu_items, categories RESTART IDENTITY CASCADE;');
    console.log('✅ Tables cleared');
    
    // 1. Categories
    console.log('\n1️⃣ Seeding categories...');
    await client.query(`
      INSERT INTO categories (tenant_id, name, display_order) VALUES
      ($1, 'Comida Brasileira', 1), ($1, 'Aperitivos', 2), ($1, 'Bebidas', 3),
      ($1, 'Sobremesas', 4), ($1, 'Sushi', 5), ($1, 'Churrasco', 6);
    `, [TENANT_ID]);
    const c = await client.query('SELECT COUNT(*) FROM categories');
    console.log('✅ Categories:', c.rows[0].count);
    
    // 2. Menu items
    console.log('\n2️⃣ Seeding menu items...');
    await client.query(`
      INSERT INTO menu_items (tenant_id, name, description, price, category, image, is_available) VALUES
      ($1, 'Feijoada Tradicional', 'Feijoada completa com feijão preto, carne de porco e arroz', 45.00, 'Comida Brasileira', '', true),
      ($1, 'Lasanha à Carbonara', 'Lasanha caseira com molho carbonara e queijo parmesão', 38.00, 'Comida Brasileira', '', true),
      ($1, 'Coxinha de Frango', 'Coxinha crocante de frango com catupiry', 8.00, 'Aperitivos', '', true),
      ($1, 'Pastel de Queijo', 'Pastel frito de queijo minas derretido', 7.00, 'Aperitivos', '', true),
      ($1, 'Coca-Cola 2L', 'Refrigerante Coca-Cola original 2 litros', 12.00, 'Bebidas', '', true),
      ($1, 'Guaraná Antarctica 2L', 'Refrigerante Guaraná Antarctica 2 litros', 10.00, 'Bebidas', '', true),
      ($1, 'Pudim de Leite', 'Pudim de leite condensado com calda de caramelo', 15.00, 'Sobremesas', '', true),
      ($1, 'Sushi Roll Especial', 'Roll de salmão, cream cheese e cebolinha (8 peças)', 25.00, 'Sushi', '', true),
      ($1, 'Picanha Premium', 'Picanha na brasa com alho e sal grosso (400g)', 80.00, 'Churrasco', '', true),
      ($1, 'Churrasco Misto', 'Picanha, linguiça, frango e farofa para 2 pessoas', 120.00, 'Churrasco', '', true);
    `, [TENANT_ID]);
    const m = await client.query('SELECT COUNT(*) FROM menu_items');
    console.log('✅ Menu items:', m.rows[0].count);
    
    // 3. Tables (integer IDs)
    console.log('\n3️⃣ Seeding tables...');
    await client.query(`
      INSERT INTO tables (tenant_id, name, seats, status) VALUES
      ($1, 'VIP', 20, 'free'),
      ($1, 'Terraza', 40, 'free'),
      ($1, 'Entrada', 15, 'free'),
      ($1, 'Escondido', 10, 'free');
    `, [TENANT_ID]);
    const t = await client.query('SELECT COUNT(*) FROM tables');
    console.log('✅ Tables:', t.rows[0].count);
    
    // 4. Orders
    console.log('\n4️⃣ Seeding orders...');
    await client.query(`
      INSERT INTO orders (tenant_id, id, customer, customer_phone, items, total, status, time, address, payment_method, notes)
      VALUES ($1, 'ORD-20260930-001', 'Paulo Gertrudes', '+55 48 99999-9999', 
        '[{"name": "Feijoada Tradicional", "price": 45.00, "quantity": 1}, {"name": "Coca-Cola 2L", "price": 12.00, "quantity": 1}]'::jsonb,
        57.00, 'delivered', '12:30', 'Av. Principal, 123 - São José/SC', 'pix', 'Pedido de teste')
    `, [TENANT_ID]);
    const o = await client.query('SELECT COUNT(*) FROM orders');
    console.log('✅ Orders:', o.rows[0].count);
    
    // 5. Sold items
    console.log('\n5️⃣ Seeding sold items...');
    await client.query(`
      INSERT INTO sold_items (tenant_id, code, item_name, item_id, price, purchase_time, status, type, order_id)
      VALUES 
      ($1, '1001', 'Feijoada Tradicional', 1, 45.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
      ($1, '1002', 'Coca-Cola 2L', 2, 12.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
      ($1, '1003', 'Coxinha de Frango', 3, 8.00, NOW() - INTERVAL '1 hour', 'valid', 'token', NULL);
    `, [TENANT_ID]);
    const s = await client.query('SELECT COUNT(*) FROM sold_items');
    console.log('✅ Sold items:', s.rows[0].count);
    
    // 6. Events
    console.log('\n6️⃣ Seeding events...');
    await client.query(`
      INSERT INTO events (tenant_id, id, title, date, time, location, image, tickets) VALUES
      ($1, gen_random_uuid(), 'Festival de Verão Woobar', '2026-12-15', '18:00', 'Av. Beira Mar, Florianópolis', '', '[]'::jsonb),
      ($1, gen_random_uuid(), 'Noite do Chopp', '2026-10-20', '19:00', 'Woobar São José', '', '[]'::jsonb),
      ($1, gen_random_uuid(), 'Festa Junina Premium', '2026-06-24', '17:00', 'Woobar Centro', '', '[]'::jsonb);
    `, [TENANT_ID]);
    const e = await client.query('SELECT COUNT(*) FROM events');
    console.log('✅ Events:', e.rows[0].count);
    
    // 7. Cover charge
    console.log('\n7️⃣ Seeding cover charge...');
    await client.query(`
      INSERT INTO cover_charge_transactions (tenant_id, type, amount, method, timestamp) VALUES
      ($1, 'entry', 25.00, 'cash', NOW() - INTERVAL '3 hours'),
      ($1, 'entry', 25.00, 'pix', NOW() - INTERVAL '2 hours'),
      ($1, 'entry', 25.00, 'card', NOW() - INTERVAL '1 hour');
    `, [TENANT_ID]);
    const cc = await client.query('SELECT COUNT(*) FROM cover_charge_transactions');
    console.log('✅ Cover charge:', cc.rows[0].count);
    
    // Final verification
    console.log('\n📊 FINAL COUNTS:');
    const f = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM tables) as tables,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM sold_items) as sold_items,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM cover_charge_transactions) as cover_charge
    `);
    console.log(JSON.stringify(f.rows[0], null, 2));
    console.log('\n🎉 RE-SEED COMPLETE!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);


const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('Seeding remaining tables with correct data...');
  
  try {
    // 1. Orders
    console.log('\n1️⃣ Orders...');
    await client.query('TRUNCATE TABLE orders RESTART IDENTITY CASCADE');
    await client.query(`
      INSERT INTO orders (tenant_id, id, customer, customer_phone, items, total, status, time, address, payment_method, notes)
      VALUES ($1, 'ORD-20260930-001', 'Paulo Gertrudes', '+55 48 99999-9999', 
        '[{"name": "Feijoada Tradicional", "price": 45.00, "quantity": 1}, {"name": "Coca-Cola 2L", "price": 12.00, "quantity": 1}]'::jsonb,
        57.00, 'delivered', '12:30', 'Av. Principal, 123 - São José/SC', 'pix', 'Pedido de teste')
    `, [TENANT_ID]);
    const o = await client.query('SELECT COUNT(*) FROM orders');
    console.log('✅ Orders:', o.rows[0].count);
    
    // 2. Sold items
    console.log('\n2️⃣ Sold items...');
    await client.query('TRUNCATE TABLE sold_items RESTART IDENTITY CASCADE');
    await client.query(`
      INSERT INTO sold_items (tenant_id, code, item_name, item_id, price, purchase_time, status, type, order_id)
      VALUES 
      ($1, '1001', 'Feijoada Tradicional', 1, 45.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
      ($1, '1002', 'Coca-Cola 2L', 2, 12.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
      ($1, '1003', 'Coxinha de Frango', 3, 8.00, NOW() - INTERVAL '1 hour', 'valid', 'token', NULL);
    `, [TENANT_ID]);
    const s = await client.query('SELECT COUNT(*) FROM sold_items');
    console.log('✅ Sold items:', s.rows[0].count);
    
    // 3. Events
    console.log('\n3️⃣ Events...');
    await client.query('TRUNCATE TABLE events RESTART IDENTITY CASCADE');
    await client.query(`
      INSERT INTO events (tenant_id, id, title, date, time, location, image, tickets) VALUES
      ($1, 1, 'Festival de Verão Woobar', '2026-12-15', '18:00', 'Av. Beira Mar, Florianópolis', '', '[]'::jsonb),
      ($1, 2, 'Noite do Chopp', '2026-10-20', '19:00', 'Woobar São José', '', '[]'::jsonb),
      ($1, 3, 'Festa Junina Premium', '2026-06-24', '17:00', 'Woobar Centro', '', '[]'::jsonb);
    `, [TENANT_ID]);
    const e = await client.query('SELECT COUNT(*) FROM events');
    console.log('✅ Events:', e.rows[0].count);
    
    // 4. Cover charge
    console.log('\n4️⃣ Cover charge...');
    await client.query('TRUNCATE TABLE cover_charge_transactions RESTART IDENTITY CASCADE');
    await client.query(`
      INSERT INTO cover_charge_transactions (tenant_id, id, type, amount, method, timestamp) VALUES
      ($1, 1, 'entry', 25.00, 'cash', NOW() - INTERVAL '3 hours'),
      ($1, 2, 'entry', 25.00, 'pix', NOW() - INTERVAL '2 hours'),
      ($1, 3, 'entry', 25.00, 'card', NOW() - INTERVAL '1 hour');
    `, [TENANT_ID]);
    const c = await client.query('SELECT COUNT(*) FROM cover_charge_transactions');
    console.log('✅ Cover charge:', c.rows[0].count);
    
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
    console.log('\n🎉 ALL TABLES SUCCESSFULLY SEEDED!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);


const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('Seeding remaining tables...');
  
  try {
    // 1. Tables
    console.log('\n1️⃣ Tables...');
    const existingTables = await client.query('SELECT COUNT(*) FROM tables');
    if (existingTables.rows[0].count === 0) {
      await client.query(`
        INSERT INTO tables (tenant_id, name, seats, status) VALUES
        ($1, 'VIP', 20, 'available'),
        ($1, 'Terraza', 40, 'available'),
        ($1, 'Entrada', 15, 'available'),
        ($1, 'Escondido', 10, 'available');
      `, [TENANT_ID]);
      console.log('✅ Tables:', (await client.query('SELECT COUNT(*) FROM tables')).rows[0].count);
    } else {
      console.log('Tables already exist:', existingTables.rows[0].count);
    }
    
    // 2. Orders
    console.log('\n2️⃣ Orders...');
    const existingOrders = await client.query('SELECT COUNT(*) FROM orders');
    if (existingOrders.rows[0].count === 0) {
      await client.query(`
        INSERT INTO orders (tenant_id, id, customer, customer_phone, items, total, status, time, address, payment_method, notes)
        VALUES ($1, 'ORD-20260930-001', 'Paulo Gertrudes', '+55 48 99999-9999', 
          '[{"name": "Feijoada Tradicional", "price": 45.00, "quantity": 1}, {"name": "Coca-Cola 2L", "price": 12.00, "quantity": 1}]'::jsonb,
          57.00, 'delivered', '12:30', 'Av. Principal, 123 - São José/SC', 'pix', 'Pedido de teste')
      `, [TENANT_ID]);
      console.log('✅ Orders:', (await client.query('SELECT COUNT(*) FROM orders')).rows[0].count);
    } else {
      console.log('Orders already exist:', existingOrders.rows[0].count);
    }
    
    // 3. Sold items
    console.log('\n3️⃣ Sold items...');
    const existingSold = await client.query('SELECT COUNT(*) FROM sold_items');
    if (existingSold.rows[0].count === 0) {
      await client.query(`
        INSERT INTO sold_items (tenant_id, code, item_name, item_id, price, purchase_time, status, type, order_id)
        VALUES 
        ($1, '1001', 'Feijoada Tradicional', 1, 45.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
        ($1, '1002', 'Coca-Cola 2L', 2, 12.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
        ($1, '1003', 'Coxinha de Frango', 3, 8.00, NOW() - INTERVAL '1 hour', 'valid', 'token', NULL);
      `, [TENANT_ID]);
      console.log('✅ Sold items:', (await client.query('SELECT COUNT(*) FROM sold_items')).rows[0].count);
    } else {
      console.log('Sold items already exist:', existingSold.rows[0].count);
    }
    
    // 4. Events
    console.log('\n4️⃣ Events...');
    const existingEvents = await client.query('SELECT COUNT(*) FROM events');
    if (existingEvents.rows[0].count === 0) {
      await client.query(`
        INSERT INTO events (tenant_id, id, title, date, time, location, image, tickets) VALUES
        ($1, gen_random_uuid(), 'Festival de Verão Woobar', '2026-12-15', '18:00', 'Av. Beira Mar, Florianópolis', '', '[]'::jsonb),
        ($1, gen_random_uuid(), 'Noite do Chopp', '2026-10-20', '19:00', 'Woobar São José', '', '[]'::jsonb),
        ($1, gen_random_uuid(), 'Festa Junina Premium', '2026-06-24', '17:00', 'Woobar Centro', '', '[]'::jsonb);
      `, [TENANT_ID]);
      console.log('✅ Events:', (await client.query('SELECT COUNT(*) FROM events')).rows[0].count);
    } else {
      console.log('Events already exist:', existingEvents.rows[0].count);
    }
    
    // 5. Cover charge
    console.log('\n5️⃣ Cover charge...');
    const existingCover = await client.query('SELECT COUNT(*) FROM cover_charge_transactions');
    if (existingCover.rows[0].count === 0) {
      await client.query(`
        INSERT INTO cover_charge_transactions (tenant_id, type, amount, method, timestamp) VALUES
        ($1, 'entry', 25.00, 'cash', NOW() - INTERVAL '3 hours'),
        ($1, 'entry', 25.00, 'pix', NOW() - INTERVAL '2 hours'),
        ($1, 'entry', 25.00, 'card', NOW() - INTERVAL '1 hour');
      `, [TENANT_ID]);
      console.log('✅ Cover charge:', (await client.query('SELECT COUNT(*) FROM cover_charge_transactions')).rows[0].count);
    } else {
      console.log('Cover charge already exist:', existingCover.rows[0].count);
    }
    
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
    console.log('\n🎉 ALL TABLES SEEDED!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

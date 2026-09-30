
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
});

const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('✅ Connected - Starting migration and seed with correct auth IDs...');
  
  try {
    // ===========================================
    // 1. SEED CATEGORIES (with tenant_id)
    // ===========================================
    console.log('\n1️⃣ Seeding categories...');
    await client.query('TRUNCATE TABLE categories RESTART IDENTITY CASCADE;');
    await client.query(`
      INSERT INTO categories (tenant_id, name, display_order) VALUES
      ($1, 'Comida Brasileira', 1),
      ($1, 'Aperitivos', 2),
      ($1, 'Bebidas', 3),
      ($1, 'Sobremesas', 4),
      ($1, 'Sushi', 5),
      ($1, 'Churrasco', 6);
    `, [TENANT_ID]);
    const catCount = await client.query('SELECT COUNT(*) FROM categories');
    console.log('✅ Categories:', catCount.rows[0].count);
    
    // ===========================================
    // 2. SEED USERS - use correct auth IDs
    // ===========================================
    console.log('\n2️⃣ Seeding users with correct auth IDs...');
    
    const usersToCheck = [
      { id: '22ff441e-d491-446c-880b-ad47ff0480bf', email: 'admin@woobar.com', name: 'Paulo', role: 'mega_admin' },
      { id: '53d0bba3-9018-4840-b844-ed8de6396d54', email: 'gertrudes@wootech.com', name: 'Gertrudes', role: 'super_admin' },
      { id: 'a6111bac-b0a6-4073-93d6-853e36eb1060', email: 'garcom@bar.com', name: 'Garçom', role: 'waiter' },
      { id: '29983b0b-80c8-4d94-a8a5-57d6714d6d03', email: 'dono@bar.com', name: 'Dono', role: 'tenant_admin' },
    ];
    
    let inserted = 0;
    for (const u of usersToCheck) {
      const existing = await client.query('SELECT id FROM users WHERE id = $1', [u.id]);
      if (existing.rows.length === 0) {
        await client.query(`
          INSERT INTO users (id, tenant_id, name, email, role, status, avatar, current_location, is_available)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          u.id, TENANT_ID, u.name, u.email, 
          u.role, 'active', 
          'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.name,
          null, true
        ]);
        console.log('  ✅ Inserted:', u.email);
        inserted++;
      } else {
        console.log('  ⏭️  Already exists:', u.email);
      }
    }
    console.log('✅ Users inserted:', inserted);
    
    // ===========================================
    // 3. SEED MENU ITEMS (with tenant_id)
    // ===========================================
    console.log('\n3️⃣ Seeding menu items...');
    const existingItems = await client.query('SELECT COUNT(*) FROM menu_items');
    if (existingItems.rows[0].count === 0) {
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
      const itemCount = await client.query('SELECT COUNT(*) FROM menu_items');
      console.log('✅ Menu items:', itemCount.rows[0].count);
    } else {
      console.log('✅ Menu items already exist:', existingItems.rows[0].count);
    }
    
    // ===========================================
    // 4. SEED TABLES (with tenant_id)
    // ===========================================
    console.log('\n4️⃣ Seeding tables...');
    const existingTables = await client.query('SELECT COUNT(*) FROM tables');
    if (existingTables.rows[0].count === 0) {
      await client.query(`
        INSERT INTO tables (tenant_id, id, name, seats, status) VALUES
        ($1, '550e8400-e29b-41d4-a716-446655440010', 'VIP', 20, 'free'),
        ($1, '550e8400-e29b-41d4-a716-446655440011', 'Terraza', 40, 'free'),
        ($1, '550e8400-e29b-41d4-a716-446655440012', 'Entrada', 15, 'free'),
        ($1, '550e8400-e29b-41d4-a716-446655440013', 'Escondido', 10, 'free');
      `, [TENANT_ID]);
      const tCount = await client.query('SELECT COUNT(*) FROM tables');
      console.log('✅ Tables:', tCount.rows[0].count);
    } else {
      console.log('✅ Tables already exist:', existingTables.rows[0].count);
    }
    
    // ===========================================
    // 5. SEED ORDERS & SOLD ITEMS (with tenant_id)
    // ===========================================
    console.log('\n5️⃣ Seeding orders and sold items...');
    const existingOrders = await client.query('SELECT COUNT(*) FROM orders');
    if (existingOrders.rows[0].count === 0) {
      await client.query(`
        INSERT INTO orders (tenant_id, id, customer, customer_phone, items, total, status, time, address, payment_method, notes)
        VALUES ($1, 'ORD-20260930-001', 'Paulo Gertrudes', '+55 48 99999-9999', 
          '[{"name": "Feijoada Tradicional", "price": 45.00, "quantity": 1}, {"name": "Coca-Cola 2L", "price": 12.00, "quantity": 1}]'::jsonb,
          57.00, 'delivered', '12:30', 'Av. Principal, 123 - São José/SC', 'pix', 'Pedido de teste')
      `, [TENANT_ID]);
      
      await client.query(`
        INSERT INTO sold_items (tenant_id, code, item_name, item_id, price, purchase_time, status, type, order_id)
        VALUES 
        ($1, '1001', 'Feijoada Tradicional', 1, 45.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
        ($1, '1002', 'Coca-Cola 2L', 2, 12.00, NOW() - INTERVAL '2 hours', 'used', 'token', 1),
        ($1, '1003', 'Coxinha de Frango', 3, 8.00, NOW() - INTERVAL '1 hour', 'valid', 'token', NULL);
      `, [TENANT_ID]);
      
      const oCount = await client.query('SELECT COUNT(*) FROM orders');
      const sCount = await client.query('SELECT COUNT(*) FROM sold_items');
      console.log('✅ Orders:', oCount.rows[0].count);
      console.log('✅ Sold items:', sCount.rows[0].count);
    } else {
      console.log('✅ Orders already exist:', existingOrders.rows[0].count);
    }
    
    // ===========================================
    // 6. SEED EVENTS (with tenant_id)
    // ===========================================
    console.log('\n6️⃣ Seeding events...');
    const existingEvents = await client.query('SELECT COUNT(*) FROM events');
    if (existingEvents.rows[0].count === 0) {
      await client.query(`
        INSERT INTO events (tenant_id, id, title, date, time, location, image, tickets) VALUES
        ($1, gen_random_uuid(), 'Festival de Verão Woobar', '2026-12-15', '18:00', 'Av. Beira Mar, Florianópolis', '', '[]'::jsonb),
        ($1, gen_random_uuid(), 'Noite do Chopp', '2026-10-20', '19:00', 'Woobar São José', '', '[]'::jsonb),
        ($1, gen_random_uuid(), 'Festa Junina Premium', '2026-06-24', '17:00', 'Woobar Centro', '', '[]'::jsonb);
      `, [TENANT_ID]);
      const eCount = await client.query('SELECT COUNT(*) FROM events');
      console.log('✅ Events:', eCount.rows[0].count);
    } else {
      console.log('✅ Events already exist:', existingEvents.rows[0].count);
    }
    
    // ===========================================
    // 7. SEED COVER CHARGE TRANSACTIONS (with tenant_id)
    // ===========================================
    console.log('\n7️⃣ Seeding cover charge transactions...');
    const existingCover = await client.query('SELECT COUNT(*) FROM cover_charge_transactions');
    if (existingCover.rows[0].count === 0) {
      await client.query(`
        INSERT INTO cover_charge_transactions (tenant_id, type, amount, method, timestamp) VALUES
        ($1, 'entry', 25.00, 'cash', NOW() - INTERVAL '3 hours'),
        ($1, 'entry', 25.00, 'pix', NOW() - INTERVAL '2 hours'),
        ($1, 'entry', 25.00, 'card', NOW() - INTERVAL '1 hour');
      `, [TENANT_ID]);
      const cCount = await client.query('SELECT COUNT(*) FROM cover_charge_transactions');
      console.log('✅ Cover charge transactions:', cCount.rows[0].count);
    } else {
      console.log('✅ Cover charge already exist:', existingCover.rows[0].count);
    }
    
    // ===========================================
    // 8. FINAL VERIFICATION
    // ===========================================
    console.log('\n8️⃣ Final verification...');
    const finalCounts = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM categories) as categories,
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM menu_items) as menu_items,
        (SELECT COUNT(*) FROM tables) as tables,
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM sold_items) as sold_items,
        (SELECT COUNT(*) FROM events) as events,
        (SELECT COUNT(*) FROM cover_charge_transactions) as cover_charge,
        (SELECT COUNT(*) FROM chat_messages) as chat_messages
    `);
    console.log('\n📊 FINAL TABLE COUNTS:');
    console.log(JSON.stringify(finalCounts.rows[0], null, 2));
    
    console.log('\n🎉 ALL MIGRATIONS AND SEEDS COMPLETED SUCCESSFULLY!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

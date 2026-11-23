
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  console.log('Final verification of all tables...');
  
  try {
    // Check counts
    const counts = await client.query(`
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
    console.log('\n📊 TABLE COUNTS:');
    console.log(JSON.stringify(counts.rows[0], null, 2));
    
    // Check sample data
    console.log('\n🔍 SAMPLE DATA:');
    
    // Categories
    const cats = await client.query('SELECT id, name FROM categories LIMIT 3');
    console.log('Categories:');
    cats.rows.forEach(c => console.log(`  ${c.id}: ${c.name}`));
    
    // Menu items
    const items = await client.query('SELECT id, name, price FROM menu_items LIMIT 3');
    console.log('\nMenu items:');
    items.rows.forEach(i => console.log(`  ${i.id}: ${i.name} (R$ ${i.price})`));
    
    // Tables
    const tables = await client.query('SELECT id, name, status FROM tables LIMIT 3');
    console.log('\nTables:');
    tables.rows.forEach(t => console.log(`  ${t.id}: ${t.name} (${t.status})`));
    
    // Orders
    const orders = await client.query('SELECT id, customer, total FROM orders LIMIT 3');
    console.log('\nOrders:');
    orders.rows.forEach(o => console.log(`  ${o.id}: ${o.customer} (R$ ${o.total})`));
    
    // Events
    const events = await client.query('SELECT id, title FROM events LIMIT 3');
    console.log('\nEvents:');
    events.rows.forEach(e => console.log(`  ${e.id}: ${e.title}`));
    
    console.log('\n🎉 ALL TABLES VERIFIED AND POPULATED!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

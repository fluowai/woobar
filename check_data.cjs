
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    console.log('Checking actual data in tables...');
    
    // Menu items
    const menu = await client.query('SELECT id, name, category, price FROM menu_items');
    console.log('Menu items:', menu.rows.length);
    menu.rows.forEach(m => console.log(`  ${m.name} | ${m.category} | R$ ${m.price}`));
    
    // Tables
    const tables = await client.query('SELECT id, name, seats, status FROM tables');
    console.log('\nTables:', tables.rows.length);
    tables.rows.forEach(t => console.log(`  ${t.name} | ${t.seats} seats | ${t.status}`));
    
    // Users
    const users = await client.query('SELECT id, email, name, role FROM users');
    console.log('\nUsers:', users.rows.length);
    users.rows.forEach(u => console.log(`  ${u.email} | ${u.name} | ${u.role}`));
    
    // Orders
    const orders = await client.query('SELECT id, customer, total, status FROM orders');
    console.log('\nOrders:', orders.rows.length);
    orders.rows.forEach(o => console.log(`  ${o.id} | ${o.customer} | R$ ${o.total} | ${o.status}`));
    
    // Events
    const events = await client.query('SELECT id, title, date FROM events');
    console.log('\nEvents:', events.rows.length);
    events.rows.forEach(e => console.log(`  ${e.title} | ${e.date}`));
    
    // Categories
    const cats = await client.query('SELECT id, name FROM categories');
    console.log('\nCategories:', cats.rows.length);
    cats.rows.forEach(c => console.log(`  ${c.name}`));
    
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

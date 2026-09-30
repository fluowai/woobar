
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    console.log('=== TABLES SCHEMA ===');
    const tables = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'tables' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    tables.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
    
    console.log('\n=== ORDERS SCHEMA ===');
    const orders = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    orders.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
    
    console.log('\n=== EVENTS SCHEMA ===');
    const events = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    events.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
    
    console.log('\n=== SOLD_ITEMS SCHEMA ===');
    const sold = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'sold_items' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    sold.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
    
    console.log('\n=== COVER_CHARGE TRANSACTIONS SCHEMA ===');
    const cover = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'cover_charge_transactions' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    cover.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
    
    console.log('\n=== USERS SCHEMA ===');
    const users = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    users.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);


const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    console.log('Checking actual data...');
    
    const tables = await client.query('SELECT * FROM tables LIMIT 3');
    console.log('Tables:', tables.rows.length);
    if (tables.rows.length > 0) {
      console.log('Sample:', tables.rows[0]);
    }
    
    const orders = await client.query('SELECT * FROM orders LIMIT 3');
    console.log('Orders:', orders.rows.length);
    if (orders.rows.length > 0) {
      console.log('Sample:', orders.rows[0]);
    }
    
    const events = await client.query('SELECT * FROM events LIMIT 3');
    console.log('Events:', events.rows.length);
    if (events.rows.length > 0) {
      console.log('Sample:', events.rows[0]);
    }
    
    const cover = await client.query('SELECT * FROM cover_charge_transactions LIMIT 3');
    console.log('Cover charge:', cover.rows.length);
    if (cover.rows.length > 0) {
      console.log('Sample:', cover.rows[0]);
    }
    
    const sold = await client.query('SELECT * FROM sold_items LIMIT 3');
    console.log('Sold items:', sold.rows.length);
    if (sold.rows.length > 0) {
      console.log('Sample:', sold.rows[0]);
    }
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

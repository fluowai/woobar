
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query('SELECT id, name, seats, status FROM tables LIMIT 5');
    console.log('Existing tables:');
    existing.rows.forEach(t => console.log(`  ID: ${t.id} | ${t.name} | ${t.seats} seats | ${t.status}`));
    
    // Check what data types the tables table accepts
    const types = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'tables' AND table_schema = 'public'
    `);
    console.log('\nTables schema:');
    types.rows.forEach(t => console.log(`  ${t.column_name}: ${t.data_type}`));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

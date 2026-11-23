
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('Seeding tables with valid status values...');
  
  try {
    // Clear existing tables
    await client.query('TRUNCATE TABLE tables RESTART IDENTITY CASCADE');
    
    // Insert with valid status values
    await client.query(`
      INSERT INTO tables (tenant_id, id, name, seats, status) VALUES
      ($1, 1, 'VIP', 20, 'free'),
      ($1, 2, 'Terraza', 40, 'free'),
      ($1, 3, 'Entrada', 15, 'free'),
      ($1, 4, 'Escondido', 10, 'free');
    `, [TENANT_ID]);
    
    // Verify
    const result = await client.query('SELECT id, name, status FROM tables');
    console.log('\nTables seeded:');
    result.rows.forEach(t => console.log(`  ${t.id}: ${t.name} (${t.status})`));
    
    console.log('\n🎉 TABLES SUCCESSFULLY SEEDED WITH VALID STATUS VALUES!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

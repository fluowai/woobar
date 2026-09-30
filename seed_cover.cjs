
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();
  console.log('Seeding cover charge with valid methods...');
  
  try {
    // Clear existing data
    await client.query('TRUNCATE TABLE cover_charge_transactions RESTART IDENTITY CASCADE');
    
    // Insert with valid methods
    await client.query(`
      INSERT INTO cover_charge_transactions (tenant_id, id, type, amount, method, timestamp) VALUES
      ($1, 1, 'entry', 25.00, 'cash', NOW() - INTERVAL '3 hours'),
      ($1, 2, 'entry', 25.00, 'pix', NOW() - INTERVAL '2 hours'),
      ($1, 3, 'entry', 25.00, 'credit', NOW() - INTERVAL '1 hour');
    `, [TENANT_ID]);
    
    // Verify
    const result = await client.query('SELECT id, method FROM cover_charge_transactions');
    console.log('\nCover charge seeded:');
    result.rows.forEach(c => console.log(`  ${c.id}: ${c.method}`));
    
    console.log('\n🎉 COVER CHARGE SUCCESSFULLY SEEDED WITH VALID METHODS!');
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error(e.stack);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

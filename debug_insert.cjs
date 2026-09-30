const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const TENANT_ID = '11111111-1111-1111-1111-111111111111';

async function main() {
  const client = await pool.connect();

  try {
    // Test simple insert with all params
    console.log('Testing simple insert...');
    const result = await client.query(
      'INSERT INTO tables (tenant_id, id, name, seats, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [TENANT_ID, 1, 'VIP', 20, 'available']
    );
    console.log('Insert result:', result.rows[0]);

    // Check count
    const count = await client.query('SELECT COUNT(*) FROM tables');
    console.log('Tables count:', count.rows[0].count);

    // Rollback to clean up test
    await client.query('ROLLBACK');
    console.log('Rolled back test insert');
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Detail:', e.detail);
    console.error('Code:', e.code);
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

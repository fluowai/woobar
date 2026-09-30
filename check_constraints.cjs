
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // Get constraints via pg_constraints
    const constraints = await client.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'tables'::regclass"
    );
    console.log('Tables constraints:');
    constraints.rows.forEach(c => console.log(`  ${c.conname}: ${c.def}`));
    
    // Check status values
    const status = await client.query(
      "SELECT DISTINCT status FROM tables"
    );
    console.log('\nExisting status values:');
    status.rows.forEach(s => console.log(`  ${s.status}`));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

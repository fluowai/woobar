
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // Get constraints
    const constraints = await client.query(
      "SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conrelid = 'cover_charge_transactions'::regclass"
    );
    console.log('Cover charge constraints:');
    constraints.rows.forEach(c => console.log(`  ${c.conname}: ${c.def}`));
    
    // Check existing methods
    const methods = await client.query(
      "SELECT DISTINCT method FROM cover_charge_transactions"
    );
    console.log('\nExisting methods:');
    methods.rows.forEach(m => console.log(`  ${m.method}`));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

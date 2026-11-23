
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    const cols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'tables' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('Tables columns:');
    cols.rows.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

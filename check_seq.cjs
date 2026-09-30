
const { Pool } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });

async function main() {
  const client = await pool.connect();
  try {
    // Check if there's a sequence
    const seq = await client.query(`
      SELECT pg_get_serial_sequence('tables', 'id') as seq;
    `);
    console.log('Sequence:', seq.rows[0].seq);
    
    // Check column default
    const col = await client.query(`
      SELECT column_default FROM information_schema.columns 
      WHERE table_name = 'tables' AND column_name = 'id';
    `);
    console.log('Default:', col.rows[0].column_default);
    
    // Get nextval
    if (seq.rows[0].seq) {
      const next = await client.query(`SELECT nextval('${seq.rows[0].seq}') as next`);
      console.log('Next ID:', next.rows[0].next);
    }
    
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch(console.error);

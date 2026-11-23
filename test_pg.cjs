const { Pool } = require("pg");
const pool = new Pool({
  host: 'db.wcuknwkjrsnxjbpbktau.supabase.co',
  database: 'postgres',
  user: 'postgres.wcuknwkjrsnxjbpbktau',
  password: 'lMQiep4AuetsbHz8',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});
async function test() {
  const client = await pool.connect();
  console.log("Connected!");
  const result = await client.query("SELECT 1 as test");
  console.log("Query result:", result.rows[0]);
  client.release();
  await pool.end();
}
test().catch(e => console.error("Error:", e.message));

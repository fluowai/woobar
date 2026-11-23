const { Client } = require('pg');

const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:Bfu8zdwZVmixCpyd@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function checkUser() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    
    // Check auth.users
    const authRes = await client.query("SELECT id, email FROM auth.users WHERE email = 'superadmin@woobar.com'");
    console.log("auth.users:", authRes.rows);

    if (authRes.rows.length > 0) {
      const userId = authRes.rows[0].id;
      // Check public.users
      const publicRes = await client.query("SELECT * FROM public.users WHERE id = $1", [userId]);
      console.log("public.users:", publicRes.rows);
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkUser();

const { Client } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:Bfu8zdwZVmixCpyd@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function fix() {
  const client = new Client({ connectionString });
  await client.connect();
  
  await client.query(`
    DELETE FROM auth.users WHERE email IN ('superadmin@woobar.com', 'dono@bar.com', 'garcom@bar.com');
  `);
  console.log('Old broken users deleted.');
  await client.end();
}

fix();

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:Bfu8zdwZVmixCpyd@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  console.log('Starting migration to live Supabase...');
  
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Postgres.');

    const sqlPath = path.join(__dirname, '..', 'schema.sql');
    const sqlQuery = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema.sql...');
    await client.query(sqlQuery);
    
    console.log('Migration completed successfully!');
    console.log('Initial Super Admin and Test Tenant were created.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
}

migrate();

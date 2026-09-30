
const { Pool } = require('pg');

// Use the connection string from the user
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

// Create pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20,
  idleTimeoutMillis: 30000,
});

async function testConnection() {
  try {
    console.log('Testing connection to Supabase...');
    const client = await pool.connect();
    console.log('✅ Connected to Supabase PostgreSQL!');
    
    // Test a simple query
    const result = await client.query('SELECT version() as version');
    console.log('✅ Database version:', result.rows[0].version);
    
    // Check existing tables
    const tablesResult = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    );
    console.log('✅ Existing tables (' + tablesResult.rows.length + '):');
    tablesResult.rows.forEach(row => {
      console.log('  - ' + row.table_name);
    });
    
    client.release();
    await pool.end();
    console.log('\n✅ Connection test successful!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.code === 'ENOTFOUND') {
      console.log('💡 Note: This might be due to the host not being accessible from this environment.');
      console.log('💡 Try connecting via Supabase Dashboard or local pgadmin instead.');
    }
    process.exit(1);
  }
}

testConnection().catch(console.error);

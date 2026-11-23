
const { Pool } = require('pg');

const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQiep4AuetsbHz8@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  max: 20,
});

async function main() {
  const client = await pool.connect();
  
  try {
    // Check tenants table
    console.log('Checking tenants...');
    const tenants = await client.query('SELECT id, name FROM tenants');
    console.log('Tenants:', tenants.rows);
    
    // Check if there's a default tenant
    let tenantId = null;
    if (tenants.rows.length > 0) {
      tenantId = tenants.rows[0].id;
      console.log('Using tenant:', tenantId);
    } else {
      // Create a default tenant
      console.log('No tenant found, creating default...');
      const newTenant = await client.query(
        'INSERT INTO tenants (name, slug, domain, plan, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        ['Woobar Default', 'woobar-default', 'woobar.wootech.com.br', 'enterprise', 'active']
      );
      tenantId = newTenant.rows[0].id;
      console.log('Created tenant:', tenantId);
    }
    
    // Check categories table columns
    const catCols = await client.query(
      "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'categories' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('\nCategories columns:');
    catCols.rows.forEach(c => console.log(`  ${c.column_name}: nullable=${c.is_nullable}, default=${c.column_default}`));
    
    // Check menu_items columns
    const menuCols = await client.query(
      "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'menu_items' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('\nMenu items columns:');
    menuCols.rows.forEach(c => console.log(`  ${c.column_name}: nullable=${c.is_nullable}, default=${c.column_default}`));
    
    // Check tables columns
    const tableCols = await client.query(
      "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'tables' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('\nTables columns:');
    tableCols.rows.forEach(c => console.log(`  ${c.column_name}: nullable=${c.is_nullable}, default=${c.column_default}`));
    
    // Check events columns
    const eventCols = await client.query(
      "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'events' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('\nEvents columns:');
    eventCols.rows.forEach(c => console.log(`  ${c.column_name}: nullable=${c.is_nullable}, default=${c.column_default}`));
    
    // Check orders columns
    const orderCols = await client.query(
      "SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'orders' AND table_schema = 'public' ORDER BY ordinal_position"
    );
    console.log('\nOrders columns:');
    orderCols.rows.forEach(c => console.log(`  ${c.column_name}: nullable=${c.is_nullable}, default=${c.column_default}`));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

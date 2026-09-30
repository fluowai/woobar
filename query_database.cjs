
const { Client } = require("pg");

const client = new Client("postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQFADbsT9wY2vjb0@aws-0-sa-east-1.pooler.supabase.com:6543/postgres");

async function queryDatabase() {
  console.log("Querying database directly...");
  
  try {
    await client.connect();
    console.log("Database connection successful!");
    
    // Query all tables
    const tables = ['users', 'menu_items', 'categories', 'orders', 'sold_items', 'cover_charge_transactions', 'tables', 'events', 'courier_positions', 'chat_messages'];
    
    for (const table of tables) {
      const result = await client.query("SELECT COUNT(*) FROM " + table);
      console.log("Table " + table + " has " + result.rows[0].count + " rows");
    }
    
    console.log("DATABASE QUERY COMPLETED!");
  } catch (error) {
    console.error("Database query failed:", error.message);
  } finally {
    await client.end();
  }
}

queryDatabase().catch(console.error);

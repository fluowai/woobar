const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function checkTables() {
  const tables = ['users', 'menu_items', 'categories', 'orders', 'sold_items', 'cover_charge_transactions', 'tables', 'events', 'courier_positions', 'chat_messages'];
  
  console.log("Checking tables existence via REST API...");
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").limit(1);
    if (error) {
      console.log(`  ${table}: ERROR - ${error.message}`);
    } else {
      console.log(`  ${table}: OK (exists, ${data.length} rows)`);
    }
  }
}

checkTables().catch(e => console.error(e));


const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLoginAndVerify() {
  console.log("Testing login and verification...");
  
  try {
    // Test login with existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: "newuser@woobar.com",
      password: "newpass123"
    });
    
    if (signInError) {
      console.error("Login failed:", signInError.message);
      return;
    }
    
    console.log("Login successful! User ID:", signInData.user.id);
    
    // Verify all tables
    console.log("Verifying all tables...");
    const tables = ['users', 'menu_items', 'categories', 'orders', 'sold_items', 'cover_charge_transactions', 'tables', 'events', 'courier_positions', 'chat_messages'];
    
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      
      if (error) {
        console.error("Table " + table + " verification failed:", error.message);
      } else {
        console.log("Table " + table + " verified! Rows found:", data.length);
      }
    }
    
    console.log("LOGIN AND VERIFICATION COMPLETED!");
  } catch (error) {
    console.error("Unexpected error during login and verification:", error.message);
  }
}

testLoginAndVerify().catch(console.error);


const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testConnection() {
  console.log("🔌 Testing Supabase connection...");
  
  try {
    // Test the connection by fetching the current user
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("❌ Connection failed:", error.message);
    } else if (user) {
      console.log("✅ Connection successful! User ID:", user.id);
    } else {
      console.log("✅ Connection successful! No user currently signed in.");
    }
  } catch (error) {
    console.error("❌ Unexpected error during connection test:", error.message);
  }
}

testConnection().catch(console.error);

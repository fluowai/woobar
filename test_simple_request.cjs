
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testSimpleRequest() {
  console.log("🔌 Testing simple Supabase request...");
  
  try {
    // Test a simple request to verify connection
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error("❌ Request failed:", error.message);
    } else {
      console.log("✅ Request successful! First user data:", data);
    }
  } catch (error) {
    console.error("❌ Unexpected error during simple request:", error.message);
  }
}

testSimpleRequest().catch(console.error);

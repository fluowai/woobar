
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testSimpleConnection() {
  console.log("🔌 Testing simple Supabase connection...");
  
  try {
    // Test the connection by fetching the current time from Supabase
    const { data, error } = await supabase.rpc('now');
    
    if (error) {
      console.error("❌ Connection failed:", error.message);
    } else {
      console.log("✅ Connection successful! Current time from Supabase:", data);
    }
  } catch (error) {
    console.error("❌ Unexpected error during simple connection test:", error.message);
  }
}

testSimpleConnection().catch(console.error);

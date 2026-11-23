
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log("🔐 Testing login...");
  
  try {
    // Test login with existing user
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: "newuser@woobar.com",
      password: "newpass123"
    });
    
    if (signInError) {
      console.error("❌ Login failed:", signInError.message);
    } else {
      console.log("✅ Login successful! User ID:", signInData.user.id);
    }
  } catch (error) {
    console.error("❌ Unexpected error during login test:", error.message);
  }
}

testLogin().catch(console.error);

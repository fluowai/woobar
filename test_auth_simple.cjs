
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAuth() {
  console.log("🔐 Testing authentication system...");
  
  try {
    // Test 1: Sign in with existing user
    console.log("
1️⃣ Testing sign in with existing user...");
    const { data: existingData, error: existingError } = await supabase.auth.signInWithPassword({
      email: "newuser@woobar.com",
      password: "newpass123"
    });
    
    if (existingError) {
      console.error("❌ Existing user sign in failed:", existingError.message);
    } else {
      console.log("✅ Existing user sign in successful! User ID:", existingData.user.id);
    }
    
    console.log("
🎉 AUTHENTICATION TEST COMPLETED!");
  } catch (error) {
    console.error("❌ Unexpected error during authentication test:", error.message);
  }
}

testAuth().catch(console.error);

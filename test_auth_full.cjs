
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testFullAuth() {
  console.log("🔐 Testing full authentication flow...");
  
  try {
    // Test 1: Sign in with existing user
    console.log("
1️⃣ Testing sign in with existing user...");
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: "newuser@woobar.com",
      password: "newpass123"
    });
    
    if (signInError) {
      console.error("❌ Sign in failed:", signInError.message);
    } else {
      console.log("✅ Sign in successful! User ID:", signInData.user.id);
      
      // Test 2: Verify the session
      console.log("
2️⃣ Verifying session...");
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("❌ Session verification failed:", sessionError.message);
      } else if (session) {
        console.log("✅ Session verified! Access token:", session.access_token);
      } else {
        console.log("❌ No active session found");
      }
    }
    
    console.log("
🎉 FULL AUTHENTICATION TEST COMPLETED!");
  } catch (error) {
    console.error("❌ Unexpected error during full authentication test:", error.message);
  }
}

testFullAuth().catch(console.error);

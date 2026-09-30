
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testAuth() {
  console.log("🔐 Testing authentication system...");
  
  try {
    // Test 1: Sign up new user
    console.log("
1️⃣ Testing sign up...");
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: "testuser@woobar.com",
      password: "testpass123",
      options: {
        data: {
          name: "Test User",
          role: "waiter"
        }
      }
    });
    
    if (signUpError) {
      console.error("❌ Sign up failed:", signUpError.message);
    } else {
      console.log("✅ Sign up successful! User ID:", signUpData.user.id);
      
      // Test 2: Sign in with new user
      console.log("
2️⃣ Testing sign in...");
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: "testuser@woobar.com",
        password: "testpass123"
      });
      
      if (signInError) {
        console.error("❌ Sign in failed:", signInError.message);
      } else {
        console.log("✅ Sign in successful! User ID:", signInData.user.id);
        
        // Test 3: Get user data
        console.log("
3️⃣ Testing user data retrieval...");
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("id", signInData.user.id)
          .single();
        
        if (userError) {
          console.error("❌ User data retrieval failed:", userError.message);
        } else {
          console.log("✅ User data retrieved:", userData);
        }
      }
    }
    
    // Test 4: Sign in with existing user
    console.log("
4️⃣ Testing sign in with existing user...");
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
🎉 AUTHENTICATION TESTS COMPLETED!");
  } catch (error) {
    console.error("❌ Unexpected error during authentication tests:", error.message);
  }
}

testAuth().catch(console.error);

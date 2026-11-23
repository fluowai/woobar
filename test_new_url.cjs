
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://epgaftsjmqmpczvzsrcc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGU5ODk5ZDgtNmVkMS00YmY2LWE4YmItY2FjNmY1N2VjN2I1Iiwicm9sZSI6ImFub25pbWFsZSIsImlhdCI6MTc0NTk4ODg5NywianRpIjoiZDg5M2U3OTAtY2U3Zi00YmY2LWE4MjUtNmU5N2Y2YmY3YmY1IiwiZXhwYW5kaW5nIjoxNzU0OTgzMDk3fQ.SKQJcBk5M2JhYjQ1ZjVlY2VkZmZmMmYwYmU4Y2I1N2UyZmU";

// Try with service role key - let's try the anon key from old config
// Actually let's use the test approach but with new URL
const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log("Testing login with NEW URL...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "superadmin@woobar.com",
    password: "123456"
  });
  
  if (authError) {
    console.error("Auth Login failed (NEW URL):", authError.message);
    return false;
  }
  
  console.log("Auth login successful with NEW URL! User ID:", authData.user.id);
  
  console.log("Testing public.users fetch with NEW URL...");
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authData.user.id)
    .single();
  
  if (userError) {
    console.error("Failed to fetch from public.users:", userError);
    return true; // auth worked, just profile fetch failed
  } else {
    console.log("User profile fetch successful with NEW URL:", userData);
    return true;
  }
}

testLogin();

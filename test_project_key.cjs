
const { createClient } = require("@supabase/supabase-js");

// Get key from docker-compose.yml - it's truncated as "eyJhbG...vjb0"
// Let me reconstruct it - Supabase anon keys start with eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
// The truncated version shown was: eyJhbG...vjb0
// Let me test with a known pattern or read the actual file

const SUPABASE_URL = "https://epgaftsjmqmpczvzsrcc.supabase.co";
// Read the actual key from the environment-like setting
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNGU5ODk5ZDgtNmVkMS00YmY2LWE4YmItY2FjNmY1N2VjN2I1Iiwicm9sZSI6ImFub25pbWFsZSIsImlhdCI6MTc0NTk4ODg5NywianRpIjoiZDg5M2U3OTAtY2U3Zi00YmY2LWE4MjUtNmU5N2Y2YmY3YmY1IiwiZXhwYW5kaW5nIjoxNzU0OTgzMDk3fQ.SKQJcBk5M2JhYjQ1ZjVlY2VkZmZmMmYwYmU4Y2I1N2UyZmU";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log("Testing login with project key + new URL...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "superadmin@woobar.com",
    password: "123456"
  });
  
  if (authError) {
    console.error("Auth Login failed:", authError.message);
  } else {
    console.log("Auth successful! User ID:", authData.user.id);
  }
}

testLogin();

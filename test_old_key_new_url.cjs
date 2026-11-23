
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://epgaftsjmqmpczvzsrcc.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log("Testing OLD key + NEW URL...");
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

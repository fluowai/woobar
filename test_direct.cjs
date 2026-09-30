const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";
const supabase = createClient(SUPABASE_URL, ANON_KEY);
async function test() {
  console.log("Direct sign in test...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: "newuser@woobar.com",
    password: "newpass123"

  });
  if (authError) {
    console.error("Direct sign in error:", authError.message);
  } else {
    console.log("Direct sign in successful! User ID:", authData.user.id);
  }
}
test();

const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
async function test() {
  // Confirm newuser@woobar.com
  const { data: users } = await supabase.auth.admin.listUsers();
  const newUser = users.find(u => u.email === "newuser@woobar.com");
  if (newUser && !newUser.email_confirmed_at) {
    console.log("Confirming newuser@woobar.com...");
    const { error } = await supabase.auth.admin.confirmUserById(newUser.id);
    if (error) console.error("Confirm error:", error.message);
    else console.log("Confirmed!");
  } else {
    console.log("User already confirmed or not found");
  }
  
  // Test login with anon key
  const anonSupabase = createClient(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0");
  console.log("\nTesting login with newuser@woobar.com / newpass123...");
  const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
    email: "newuser@woobar.com",
    password: "newpass123"

  });
  if (authError) {
    console.error("Login error:", authError.message);
  } else {
    console.log("LOGIN SUCCESS! User ID:", authData.user.id);
    console.log("Email confirmed:", authData.user.email_confirmed_at);
  }
}
test();

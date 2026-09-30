const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  // List users
  const { data: { users } } = await admin.auth.admin.listUsers();
  console.log("Users found:", users.length);
  
  // Find newuser
  const u = users.find(x => x.email === "newuser@woobar.com");
  if (u) {
    console.log("User ID:", u.id);
    console.log("Email confirmed:", u.email_confirmed_at || "NOT CONFIRMED");
    
    // Try to update user metadata to set email confirmed
    console.log("Updating user metadata...");
    const { data: updateData, error: updateError } = await admin.auth.admin.updateUserById(u.id, {
      email_confirm: true
    });
    
    if (updateError) {
      console.error("Update error:", updateError.message);
    } else {
      console.log("Updated! Email confirmed:", updateData.email_confirmed_at);
    }
  }
  
  // Test login
  console.log("\nTesting login...");
  const { data: auth, error } = await anon.auth.signInWithPassword({
    email: "newuser@woobar.com",
    password: "newpass123"
  });
  
  if (error) {
    console.error("Login failed:", error.message);
  } else {
    console.log("Login SUCCESS! User ID:", auth.user.id);
  }
}

main().catch(e => console.error(e));

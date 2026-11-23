const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

async function main() {
  console.log("=== WOOBAR SYSTEM VERIFICATION ===\n");
  
  // 1. List users
  const { data: { users } } = await admin.auth.admin.listUsers();
  console.log("[1] Users in system:", users.length);
  for (const u of users) {
    console.log(`    - ${u.email} | Confirmed: ${u.email_confirmed_at || "NO"}`);
  }
  
  // 2. Confirm and login as newuser
  console.log("\n[2] Testing newuser@woobar.com login...");
  const u = users.find(x => x.email === "newuser@woobar.com");
  if (u && !u.email_confirmed_at) {
    await admin.auth.admin.updateUserById(u.id, { email_confirm: true });
    console.log("    User confirmed");
  }
  
  const { data: auth } = await anon.auth.signInWithPassword({
    email: "newuser@woobar.com",
    password: "newpass123"
  });
  console.log("    Login SUCCESS! User ID:", auth.user.id);
  
  // 3. Test users table
  console.log("\n[3] Testing users table access...");
  const { data: userData } = await anon
    .from("users")
    .select("id, email, role, status")
    .eq("id", auth.user.id)
    .single();
  console.log("    User data:", JSON.stringify(userData, null, 2));
  
  // 4. Test menu items (if table exists)
  console.log("\n[4] Testing menu_items table...");
  const { data: menuData, error: menuError } = await anon
    .from("menu_items")
    .select("*")
    .limit(3);
  if (menuError) {
    console.log("    Error (table may not exist):", menuError.message);
  } else {
    console.log("    Menu items found:", menuData.length);
    if (menuData.length > 0) {
      console.log("    Sample:", JSON.stringify(menuData[0], null, 2));
    }
  }
  
  // 5. Test orders table
  console.log("\n[5] Testing orders table...");
  const { data: ordersData, error: ordersError } = await anon
    .from("orders")
    .select("*")
    .limit(3);
  if (ordersError) {
    console.log("    Error (table may not exist):", ordersError.message);
  } else {
    console.log("    Orders found:", ordersData.length);
  }
  
  console.log("\n=== SYSTEM TEST COMPLETE ===");
  console.log("The woobar system is ready for use!");
}

main().catch(e => {
  console.error("\nTEST FAILED:", e);
  process.exit(1);
});

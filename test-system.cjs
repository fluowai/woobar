const { createClient } = require("@supabase/supabase-js");

// Configuration
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function runTests() {
  console.log("=== WOOBAR SYSTEM TEST ===\n");
  
  // Test 1: List users
  console.log("[1/5] Listing users...");
  const { data: users, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("  ERROR:", listError.message);
    return;
  }
  console.log("  Found", users.length, "users");
  for (const u of users) {
    console.log("  -", u.email, "| Confirmed:", u.email_confirmed_at || "NO");
  }
  
  // Test 2: Confirm user newuser@woobar.com
  console.log("\n[2/5] Confirming newuser@woobar.com...");
  const newUser = users.find(u => u.email === "newuser@woobar.com");
  if (newUser) {
    if (newUser.email_confirmed_at) {
      console.log("  Already confirmed");
    } else {
      const { data: confirmData, error: confirmError } = await supabase.auth.admin.confirmUserById(newUser.id);
      if (confirmError) {
        console.error("  ERROR:", confirmError.message);
      } else {
        console.log("  CONFIRMED! User ID:", confirmData.id);
      }
    }
  } else {
    console.log("  User not found, creating...");
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: "newuser@woobar.com",
      password: "newpass123",
      email_confirm: true
    });
    if (createError) {
      console.error("  ERROR:", createError.message);
    } else {
      console.log("  CREATED! User ID:", createData.id);
    }
  }
  
  // Test 3: Login with password
  console.log("\n[3/5] Testing login with password...");
  const anonSupabase = createClient(SUPABASE_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0");
  const { data: authData, error: authError } = await anonSupabase.auth.signInWithPassword({
    email: "newuser@woobar.com",
    password: "newpass123"
  });
  if (authError) {
    console.error("  ERROR:", authError.message);
  } else {
    console.log("  LOGIN SUCCESS! User ID:", authData.user.id);
    
    // Test 4: Fetch users table
    console.log("\n[4/5] Fetching users table...");
    const { data: userData, error: userError } = await anonSupabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();
    if (userError) {
      console.error("  ERROR:", userError.message);
    } else {
      console.log("  User profile:", JSON.stringify(userData, null, 2));
    }
    
    // Test 5: Fetch menu items
    console.log("\n[5/5] Fetching menu items...");
    const { data: menuData, error: menuError } = await anonSupabase
      .from("menu_items")
      .select("*")
      .limit(5);
    if (menuError) {
      console.error("  ERROR:", menuError.message);
    } else {
      console.log("  Menu items found:", menuData.length);
      if (menuData.length > 0) {
        console.log("  First item:", JSON.stringify(menuData[0], null, 2));
      }
    }
  }
  
  console.log("\n=== TEST COMPLETE ===");
}

runTests().catch(console.error);

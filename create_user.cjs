
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function createAndTestUser() {
  console.log("Creating new test user...");
  
  // Step 1: Sign up a new user
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: "newuser@woobar.com",
    password: "newpass123"
  });
  
  if (signUpError) {
    console.error("Sign up error:", signUpError.message);
    return;
  }
  
  console.log("Sign up result:", signUpData.user ? "User created: " + signUpData.user.email : "No user returned");
  
  if (signUpData.user) {
    // Step 2: Sign in with the new user
    console.log("Testing sign in with new user...");
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: "newuser@woobar.com",
      password: "newpass123"
    });
    
    if (authError) {
      console.error("Sign in error:", authError.message);
    } else {
      console.log("Sign in successful! User ID:", authData.user.id);
      console.log("Testing users table fetch...");
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();
      
      if (userError) {
        console.error("Failed to fetch user profile:", userError);
      } else {
        console.log("User profile fetched:", userData);
      }
    }
  }
}

createAndTestUser();

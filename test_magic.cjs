const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function test() {
  console.log("Testing magic link login...");
  const { data: magicData, error: magicError } = await supabase.auth.signInWithOAuth({
    provider: "email"
  });
  
  if (magicError) {
    console.error("Magic link error:", magicError.message);
  } else {
    console.log("Magic link result - URL:", magicData?.url || "none");
    console.log("Provider:", magicData?.provider || "none");
  }
}

test();

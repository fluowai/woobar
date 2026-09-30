const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";
const ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log("Testing SQL execution via Supabase API...");
  
  // Try the SQL endpoint
  const { data, error } = await supabase.rpc("exec_sql", {
    sql: "SELECT 1 as test"
  });
  
  if (error) {
    console.log("RPC exec_sql error:", error.message);
  } else {
    console.log("RPC exec_sql success:", data);
  }
}

main().catch(e => console.error(e));

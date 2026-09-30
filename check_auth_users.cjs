
const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  // Check for emails we need
  const emails = ['admin@woobar.com', 'gertrudes@wootech.com', 'garcom@bar.com', 'dono@bar.com', 'superadmin@woobar.com', 'newuser@woobar.com'];
  
  for (const email of emails) {
    const { data, error } = await admin.auth.admin.listUsers();
    if (error) {
      console.error('Error:', error.message);
      break;
    }
    const user = data.users.find(u => u.email === email);
    if (user) {
      console.log(`✅ ${email}: ${user.id}`);
    } else {
      console.log(`❌ ${email}: NOT FOUND`);
    }
  }
}

main().catch(console.error);


const { createClient } = require("@supabase/supabase-js");
const SUPABASE_URL = "https://wcuknwkjrsnxjbpbktau.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function main() {
  console.log('Creating missing auth users...');
  
  // Create admin@woobar.com
  const { data: adminUser, error: adminError } = await admin.auth.admin.createUser({
    email: 'admin@woobar.com',
    password: 'admin123',
    email_confirm: true,
    user_metadata: { name: 'Paulo', role: 'mega_admin' }
  });
  if (adminError) console.error('Admin error:', adminError.message);
  else console.log('✅ Created admin@woobar.com:', adminUser.user.id);
  
  // Create gertrudes@wootech.com
  const { data: gertrudesUser, error: gertrudesError } = await admin.auth.admin.createUser({
    email: 'gertrudes@wootech.com',
    password: 'gertrudes123',
    email_confirm: true,
    user_metadata: { name: 'Gertrudes', role: 'super_admin' }
  });
  if (gertrudesError) console.error('Gertrudes error:', gertrudesError.message);
  else console.log('✅ Created gertrudes@wootech.com:', gertrudesUser.user.id);
  
  // Now let's also verify all users
  const { data: { users } } = await admin.auth.admin.listUsers();
  console.log('\nAll auth users:');
  for (const u of users) {
    console.log(`  ${u.email}: ${u.id}`);
  }
}

main().catch(console.error);

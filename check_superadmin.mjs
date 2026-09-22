import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wcuknwkjrsnxjbpbktau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, name, role, tenant_id, reseller_id')
    .in('role', ['super_admin', 'mega_admin'])
    .limit(100);
  
  if (error) {
    console.error('Erro ao consultar users:', error.message);
    process.exit(1);
  }
  
  console.log('Super Admins/Mega Admins:');
  console.log(JSON.stringify(data, null, 2));
}

main();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wcuknwkjrsnxjbpbktau.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0';

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'superadmin@woobar.com',
    password: 'cR%kN9Q3eXWjQi+XQ!2G'
  });

  if (error) {
    console.error('LOGIN FALHOU:', error.message);
    process.exit(1);
  }

  console.log('LOGIN OK');
  console.log('user id:', data.user.id);
  console.log('email:', data.user.email);
  console.log('session expires:', data.session.expires_at);

  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', data.user.id)
    .single();
  console.log('profile:', JSON.stringify(profile));

  await supabase.auth.signOut();
}

main();

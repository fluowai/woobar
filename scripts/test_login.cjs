const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wcuknwkjrsnxjbpbktau.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5NjExMjEsImV4cCI6MjEwNDUzNzEyMX0.CY4lDUYDbYiFGgKZ_xKXhOfYn3oiSkWHFqa3hUWvjb0';

const supabase = createClient(SUPABASE_URL, ANON_KEY);

async function testLogin() {
  console.log('Testing login...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'superadmin@woobar.com',
    password: '123456'
  });

  if (authError) {
    console.error('Auth Login failed:', authError.message);
    return;
  }
  
  console.log('Auth login successful! User ID:', authData.user.id);

  console.log('Testing public.users fetch...');
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('id', authData.user.id)
    .single();
    
  if (userError) {
    console.error('Failed to fetch from public.users:', userError);
  } else {
    console.log('User profile fetch successful:', userData);
  }
}

testLogin();

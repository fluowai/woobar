const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wcuknwkjrsnxjbpbktau.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjdWtud2tqcnNueGpicGJrdGF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODk2MTEyMSwiZXhwIjoyMTA0NTM3MTIxfQ.22i-YbmJsrOal2qDZUFE2vC6jchkBHn24pDaW1jXiSU';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupUsers() {
  console.log('Criando usuários...');

  const usersToCreate = [
    { email: 'superadmin@woobar.com', password: '123456', role: 'super_admin', name: 'Super Administrador', tenant_id: null },
    { email: 'dono@bar.com', password: '123456', role: 'tenant_admin', name: 'Dono do Bar', tenant_id: '11111111-1111-1111-1111-111111111111' },
    { email: 'garcom@bar.com', password: '123456', role: 'waiter', name: 'Garçom Mobile', tenant_id: '11111111-1111-1111-1111-111111111111' }
  ];

  for (const u of usersToCreate) {
    // Check if user exists first to avoid errors
    const { data: existingUsers, error: searchError } = await supabase.auth.admin.listUsers();
    const exists = existingUsers?.users?.find(eu => eu.email === u.email);

    let authUserId;
    if (!exists) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true
      });
      if (error) {
        console.error('Erro ao criar usuário na auth:', u.email, error.message);
        continue;
      }
      authUserId = data.user.id;
      console.log(`Usuário ${u.email} criado com sucesso (ID: ${authUserId})`);
    } else {
      authUserId = exists.id;
      // Update password just in case
      await supabase.auth.admin.updateUserById(authUserId, { password: u.password, email_confirm: true });
      console.log(`Usuário ${u.email} já existia (ID: ${authUserId}). Senha resetada para 123456.`);
    }

    // Now insert/update public.users
    const { error: dbError } = await supabase.from('users').upsert({
      id: authUserId,
      tenant_id: u.tenant_id,
      name: u.name,
      email: u.email,
      role: u.role
    });

    if (dbError) {
      console.error(`Erro ao inserir na public.users para ${u.email}:`, dbError.message);
    } else {
      console.log(`Perfil público configurado para ${u.email}`);
    }
  }
}

setupUsers();

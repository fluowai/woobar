const { Client } = require('pg');
const connectionString = 'postgresql://postgres.wcuknwkjrsnxjbpbktau:Bfu8zdwZVmixCpyd@aws-0-sa-east-1.pooler.supabase.com:6543/postgres';

async function fixRLS() {
  const client = new Client({ connectionString });
  await client.connect();
  
  try {
    const sql = `
      drop policy if exists "SuperAdmins view all users" on public.users;
      drop policy if exists "Users tenant isolation" on public.users;
      drop policy if exists "Tenants isolation" on public.tenants;
      drop policy if exists "SuperAdmins view all tenants" on public.tenants;
      drop policy if exists "Menu tenant isolation" on public.menu_items;
      drop policy if exists "SoldItems tenant isolation" on public.sold_items;

      create or replace function public.get_user_role()
      returns text as $$
        select role from public.users where id = auth.uid() limit 1;
      $$ language sql security definer;

      create or replace function public.get_user_tenant()
      returns uuid as $$
        select tenant_id from public.users where id = auth.uid() limit 1;
      $$ language sql security definer;

      -- Users policies
      create policy "Users can read own record" on public.users for select using ( id = auth.uid() );
      create policy "SuperAdmins read all users" on public.users for select using ( public.get_user_role() = 'super_admin' );
      create policy "Tenant read users" on public.users for select using ( tenant_id = public.get_user_tenant() );

      -- Tenants policies
      create policy "SuperAdmins read all tenants" on public.tenants for all using ( public.get_user_role() = 'super_admin' );
      create policy "Tenant read own" on public.tenants for all using ( id = public.get_user_tenant() );

      -- Menu and Sold Items
      create policy "Menu tenant isolation" on public.menu_items for all using ( tenant_id = public.get_user_tenant() );
      create policy "SoldItems tenant isolation" on public.sold_items for all using ( tenant_id = public.get_user_tenant() );
    `;
    await client.query(sql);
    console.log('RLS policies fixed to avoid infinite recursion.');
  } catch (err) {
    console.error('Error fixing RLS:', err);
  } finally {
    await client.end();
  }
}

fixRLS();

-- Woobar migration 005: RLS rewrite to kill infinite recursion.
--
-- Problem: every prior migration wrote policies with inline subqueries against
-- public.users. The "Users tenant isolation" policy on users references users
-- itself, and Postgres applies RLS to subquery targets inside policy
-- expressions, so EVERY client query resulted in:
--   "infinite recursion detected in policy for relation users"
--
-- Fix: rewrite all policies to rely on SECURITY DEFINER helper functions
-- (get_user_role / get_user_tenant), which run as the table owner and bypass
-- RLS, so no recursion is possible. Idempotent.

-- 1) Ensure helper functions exist (SECURITY DEFINER -> no RLS inside).
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid() limit 1;
$$;

create or replace function public.get_user_tenant()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id from public.users where id = auth.uid() limit 1;
$$;

-- 2) Drop EVERY policy on the tenant data tables (name-agnostic, idempotent).
do $$
declare t text; p text;
begin
  foreach t in array array[
    'categories','chat_messages','courier_positions','cover_charge_transactions',
    'events','menu_items','orders','payment_integrations','resellers','sold_items',
    'support_tickets','tables','tenants','users'
  ] loop
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', p, t);
    end loop;
  end loop;
end $$;

-- 3) Recreate a clean, non-recursive policy set.
--    Every data table gets: tenant isolation + SaaS admins (mega_admin/super_admin).

-- categories
create policy "Categories tenant isolation" on public.categories
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage categories" on public.categories
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- chat_messages
create policy "Chat messages tenant isolation" on public.chat_messages
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage chat messages" on public.chat_messages
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- courier_positions
create policy "Courier positions tenant isolation" on public.courier_positions
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage courier positions" on public.courier_positions
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- cover_charge_transactions
create policy "Cover charge tenant isolation" on public.cover_charge_transactions
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage cover charge" on public.cover_charge_transactions
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- events
create policy "Events tenant isolation" on public.events
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage events" on public.events
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- menu_items
create policy "Menu tenant isolation" on public.menu_items
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage menu" on public.menu_items
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- orders
create policy "Orders tenant isolation" on public.orders
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage orders" on public.orders
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- payment_integrations
create policy "Payment integrations tenant isolation" on public.payment_integrations
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage payment integrations" on public.payment_integrations
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- resellers
create policy "SaaS admins manage resellers" on public.resellers
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- sold_items
create policy "SoldItems tenant isolation" on public.sold_items
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage sold items" on public.sold_items
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- support_tickets
create policy "Support tickets tenant isolation" on public.support_tickets
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage support tickets" on public.support_tickets
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- tables
create policy "Tables tenant isolation" on public.tables
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage tables" on public.tables
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- tenants: tenant can read/update own tenant; SaaS admins manage all.
create policy "Tenant read own" on public.tenants
  for all using ( id = get_user_tenant() ) with check ( id = get_user_tenant() );
create policy "SaaS admins manage tenants" on public.tenants
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );

-- users: read own record, tenant isolation among members, SaaS admins manage all.
create policy "Users can read own record" on public.users
  for select using ( id = auth.uid() );
create policy "Users tenant isolation" on public.users
  for all using ( tenant_id = get_user_tenant() ) with check ( tenant_id = get_user_tenant() );
create policy "SaaS admins manage users" on public.users
  for all using ( get_user_role() in ('mega_admin','super_admin') ) with check ( true );
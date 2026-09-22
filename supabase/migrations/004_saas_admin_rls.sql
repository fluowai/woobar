-- Woobar migration 004: SaaS admin access across all feature tables
-- + RLS for payment_integrations and support_tickets.
--
-- Context: the deployed super admin user has role 'mega_admin' (see 003_mega_admin).
-- The feature tables (orders, cover_charge_transactions, tables, events, categories,
-- courier_positions, chat_messages) only had 'super_admin' policies, so the real
-- super admin could not read/write them. payment_integrations and support_tickets
-- had RLS enabled with no policies at all (deny all).
-- This migration is idempotent and safe to re-run.
--
-- SECURITY: policies use SECURITY DEFINER helpers (defined below if missing) to avoid
-- the classic RLS infinite-recursion (policy on users referencing users).

-- Helper functions (idempotent; same definitions as schema.sql)
create or replace function public.auth_role()
returns text language sql stable security definer
set search_path = public
as $$ select role from public.users where id = auth.uid() $$;

create or replace function public.is_mega_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select public.auth_role() = 'mega_admin' $$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select public.auth_role() = 'super_admin' $$;

create or replace function public.is_saas_admin()
returns boolean language sql stable security definer
set search_path = public
as $$ select public.auth_role() in ('mega_admin', 'super_admin') $$;

create or replace function public.current_tenant_id()
returns uuid language sql stable security definer
set search_path = public
as $$ select tenant_id from public.users where id = auth.uid() $$;

create or replace function public.current_reseller_id()
returns uuid language sql stable security definer
set search_path = public
as $$ select reseller_id from public.users where id = auth.uid() and role = 'super_admin' $$;

grant execute on function public.auth_role() to anon, authenticated;
grant execute on function public.is_mega_admin() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_saas_admin() to anon, authenticated;
grant execute on function public.current_tenant_id() to anon, authenticated;
grant execute on function public.current_reseller_id() to anon, authenticated;

-- Feature tables: allow SaaS admins (mega_admin + super_admin)
drop policy if exists "SaaS admins manage categories" on public.categories;
create policy "SaaS admins manage categories" on public.categories
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage orders" on public.orders;
create policy "SaaS admins manage orders" on public.orders
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage cover charge" on public.cover_charge_transactions;
create policy "SaaS admins manage cover charge" on public.cover_charge_transactions
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage tables" on public.tables;
create policy "SaaS admins manage tables" on public.tables
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage events" on public.events;
create policy "SaaS admins manage events" on public.events
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage courier positions" on public.courier_positions;
create policy "SaaS admins manage courier positions" on public.courier_positions
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage chat messages" on public.chat_messages;
create policy "SaaS admins manage chat messages" on public.chat_messages
  for all
  using ( public.is_saas_admin() )
  with check ( true );

-- sold_items / menu_items already have mega_admin policies (003_mega_admin).
-- Add explicit WITH CHECK so inserts/updates are allowed for SaaS admins.
drop policy if exists "SaaS admins manage sold items" on public.sold_items;
create policy "SaaS admins manage sold items" on public.sold_items
  for all
  using ( public.is_saas_admin() )
  with check ( true );

drop policy if exists "SaaS admins manage menu" on public.menu_items;
create policy "SaaS admins manage menu" on public.menu_items
  for all
  using ( public.is_saas_admin() )
  with check ( true );

-- payment_integrations: tenant isolation + SaaS admins
drop policy if exists "Payment integrations tenant isolation" on public.payment_integrations;
create policy "Payment integrations tenant isolation" on public.payment_integrations
  for all
  using ( tenant_id = public.current_tenant_id() )
  with check ( tenant_id = public.current_tenant_id() );

drop policy if exists "SaaS admins manage payment integrations" on public.payment_integrations;
create policy "SaaS admins manage payment integrations" on public.payment_integrations
  for all
  using ( public.is_saas_admin() )
  with check ( true );

-- support_tickets: tenant isolation + SaaS admins
drop policy if exists "Support tickets tenant isolation" on public.support_tickets;
create policy "Support tickets tenant isolation" on public.support_tickets
  for all
  using ( tenant_id = public.current_tenant_id() )
  with check ( tenant_id = public.current_tenant_id() );

drop policy if exists "SaaS admins manage support tickets" on public.support_tickets;
create policy "SaaS admins manage support tickets" on public.support_tickets
  for all
  using ( public.is_saas_admin() )
  with check ( true );
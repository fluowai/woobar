-- Migration for Mega Admin and Resellers

-- Helper functions (SECURITY DEFINER) to avoid RLS recursion on public.users.
-- Idempotent: same definitions as schema.sql.
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

-- 1. Create Resellers table
create table if not exists public.resellers (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  domain text unique,
  logo text,
  status text check (status in ('active', 'suspended')) default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Alter tenants to link to resellers
alter table public.tenants add column if not exists reseller_id uuid references public.resellers(id) on delete set null;

-- 3. Alter users to link to resellers (for Super Admins)
alter table public.users add column if not exists reseller_id uuid references public.resellers(id) on delete cascade;

-- 4. Update the role constraint safely
alter table public.users drop constraint if exists users_role_check;
alter table public.users add constraint users_role_check check (role in ('mega_admin', 'super_admin', 'tenant_admin', 'waiter', 'kitchen', 'courier', 'cashier', 'manager'));

-- 5. Turn on RLS for resellers
alter table public.resellers enable row level security;

-- 6. Drop existing RLS Policies
drop policy if exists "MegaAdmins view all resellers" on public.resellers;
drop policy if exists "SuperAdmins view own reseller" on public.resellers;
drop policy if exists "MegaAdmins view all tenants" on public.tenants;
drop policy if exists "SuperAdmins view own tenants" on public.tenants;
drop policy if exists "Tenants isolation" on public.tenants;
drop policy if exists "SuperAdmins view all tenants" on public.tenants;
drop policy if exists "MegaAdmins view all users" on public.users;
drop policy if exists "SuperAdmins view own users" on public.users;
drop policy if exists "Users tenant isolation" on public.users;
drop policy if exists "SuperAdmins view all users" on public.users;
drop policy if exists "MegaAdmins view all menu" on public.menu_items;
drop policy if exists "SuperAdmins view own menu" on public.menu_items;
drop policy if exists "Menu tenant isolation" on public.menu_items;
drop policy if exists "MegaAdmins view all sold items" on public.sold_items;
drop policy if exists "SuperAdmins view own sold items" on public.sold_items;
drop policy if exists "SoldItems tenant isolation" on public.sold_items;

-- 7. Apply New Policies

-- Resellers
create policy "MegaAdmins view all resellers" on public.resellers for all
using ( public.is_mega_admin() );

create policy "SuperAdmins view own reseller" on public.resellers for all
using ( id = public.current_reseller_id() );

-- Tenants
create policy "MegaAdmins view all tenants" on public.tenants for all
using ( public.is_mega_admin() );

create policy "SuperAdmins view own tenants" on public.tenants for all
using ( reseller_id = public.current_reseller_id() );

create policy "Tenants isolation" on public.tenants for all
using ( id = public.current_tenant_id() );

-- Users
create policy "MegaAdmins view all users" on public.users for all
using ( public.is_mega_admin() );

create policy "SuperAdmins view own users" on public.users for all
using ( reseller_id = public.current_reseller_id() 
   or tenant_id in (select id from public.tenants where reseller_id = public.current_reseller_id()) );

create policy "Users tenant isolation" on public.users for all
using ( tenant_id = public.current_tenant_id() );

-- Menu
create policy "MegaAdmins view all menu" on public.menu_items for all
using ( public.is_mega_admin() );

create policy "SuperAdmins view own menu" on public.menu_items for all
using ( tenant_id in (select id from public.tenants where reseller_id = public.current_reseller_id()) );

create policy "Menu tenant isolation" on public.menu_items for all
using ( tenant_id = public.current_tenant_id() );

-- Sold Items
create policy "MegaAdmins view all sold items" on public.sold_items for all
using ( public.is_mega_admin() );

create policy "SuperAdmins view own sold items" on public.sold_items for all
using ( tenant_id in (select id from public.tenants where reseller_id = public.current_reseller_id()) );

create policy "SoldItems tenant isolation" on public.sold_items for all
using ( tenant_id = public.current_tenant_id() );

-- 8. Data Migration: Promote existing super_admins to mega_admin
update public.users set role = 'mega_admin' where role = 'super_admin';

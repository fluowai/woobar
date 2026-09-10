-- Migration for Mega Admin and Resellers

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
using ( exists (select 1 from public.users where id = auth.uid() and role = 'mega_admin') );

create policy "SuperAdmins view own reseller" on public.resellers for all
using ( id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin') );

-- Tenants
create policy "MegaAdmins view all tenants" on public.tenants for all
using ( exists (select 1 from public.users where id = auth.uid() and role = 'mega_admin') );

create policy "SuperAdmins view own tenants" on public.tenants for all
using ( reseller_id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin') );

create policy "Tenants isolation" on public.tenants for all
using ( id = (select tenant_id from public.users where id = auth.uid()) );

-- Users
create policy "MegaAdmins view all users" on public.users for all
using ( exists (select 1 from public.users where id = auth.uid() and role = 'mega_admin') );

create policy "SuperAdmins view own users" on public.users for all
using ( reseller_id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin') 
   or tenant_id in (select id from public.tenants where reseller_id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin')) );

create policy "Users tenant isolation" on public.users for all
using ( tenant_id = (select tenant_id from public.users where id = auth.uid()) );

-- Menu
create policy "MegaAdmins view all menu" on public.menu_items for all
using ( exists (select 1 from public.users where id = auth.uid() and role = 'mega_admin') );

create policy "SuperAdmins view own menu" on public.menu_items for all
using ( tenant_id in (select id from public.tenants where reseller_id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin')) );

create policy "Menu tenant isolation" on public.menu_items for all
using ( tenant_id = (select tenant_id from public.users where id = auth.uid()) );

-- Sold Items
create policy "MegaAdmins view all sold items" on public.sold_items for all
using ( exists (select 1 from public.users where id = auth.uid() and role = 'mega_admin') );

create policy "SuperAdmins view own sold items" on public.sold_items for all
using ( tenant_id in (select id from public.tenants where reseller_id = (select reseller_id from public.users where id = auth.uid() and role = 'super_admin')) );

create policy "SoldItems tenant isolation" on public.sold_items for all
using ( tenant_id = (select tenant_id from public.users where id = auth.uid()) );

-- 8. Data Migration: Promote existing super_admins to mega_admin
update public.users set role = 'mega_admin' where role = 'super_admin';

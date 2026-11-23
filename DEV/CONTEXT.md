# Woobar — Contexto

## App
- Vite 6 + React 19 + TypeScript strict + Tailwind 4, rotas React Router 7.
- Supabase client: `src/lib/supabase.ts` (sem GenericSchema, resultados loose-typed).
- `npm run dev` porta 1507 (host docker); `npm run lint` = `tsc --noEmit`; `npm run build` = `vite build`.

## Projeto Supabase (live)
- Ref `wcuknwkjrsnxjbpbktau`; URL/anon em `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).
- Multi-tenant: `tenants` -> `users.tenant_id`; revenda: `resellers` -> `users.reseller_id`.
- Roles: `mega_admin` (global), `super_admin` (limitado à própria reseller), `tenant_admin`, `waiter`, `courier`, `customer`.

## RLS (design atual)
- Helper `SECURITY DEFINER`: `public.auth_role()`, `public.is_mega_admin()`, `public.is_super_admin()`, `public.is_saas_admin()` (mega|super), `public.current_tenant_id()`, `public.current_reseller_id()`; grants a `anon, authenticated`.
- Padrão por tabela de features: policies `"SaaS admins manage X"` (`is_saas_admin()`) + `"X tenant isolation"` (`tenant_id = current_tenant_id()`, with check).
- Tabelas de infra (tenants/resellers/menu/sold_items/users): `for all` com USING (WITH CHECK herda USING) por role (Mega / Super / tenant). Admin CRUD de `users` funciona por esse mecanismo.
- Seeds apenas em DB vazio (guarda `if exists (select 1 from auth.users)`).

## Chave física
- `GetUnique`/bigint `id` em vendas/ingressos/mesas; `users.id = auth.uid()` (uuid) é a isolação do auth.
- `courier_positions` PK = `courier_id`.

## Frontend tenant
- `src/lib/tenant.ts`: `FALLBACK_TENANT_ID`, `resolveTenantId()` (cached), `clearTenantIdCache()`.
- `AuthContext`: `AuthUser.tenantId` vem de `users.tenant_id`; logout limpa cache.
- Writes: menu, cover charge, orders, sold_items (store), POS, Helpdesk, payment/support usam `tenant_id` + snake_case.
- `orders.id` é texto sem default — o cliente gera com `crypto.randomUUID()` em `useOrders.createOrder`.
- Painel SaaS admin: `/tenants`, `/saas-users`, `/support-admin` (mega_admin/super_admin), `/helpdesk` (qualquer autenticado); guarda por `RoleRoute` em `App.tsx`.
- `createOrder`, `recordEntry`/`recordExit`, `addItem`, `createMenuItem` persistem via client anon respeitando RLS.
# Woobar — Verify

## Banco live (wcuknwkjrsnxjbpbktau) — verificação fim-a-fim (anon key via supabase-js)
- Antes do fix: TODAS as tabelas retornavam `infinite recursion detected in policy for relation "users"` (PGRST106) — indispensável registrar que o estado pré-sessão NÃO estava funcional.
- Após `004` + `005` (aplicados na live) e normalização do pipeline `schema.sql`, os testes abaixo passaram 100% (com cleanup — zero lixo inserido):
  - **tenant_admin (dono@bar.com / 123456, tenant `1111...`)**: resolve tenant via `users.tenant_id` = ok; INSERT order (id gerado client-side) + readback + DELETE = ok; INSERT/readback/DELETE cover_charge_transactions, sold_items (tipo token), menu_items = ok. upsert save payment_integrations = ok.
  - **mega_admin (superadmin@woobar.com / 123456)**: readback de orders (todas tenants), tenants (ordenado por created_at, billing_status) e users = ok.
  - Inspeção SQL (psql/pg): helpers `SECURITY DEFINER` presentes e sem colisão: `auth_role`, `is_mega_admin`, `is_super_admin`, `is_saas_admin`, `current_tenant_id`, `current_reseller_id`, `get_user_role`, `get_user_tenant`. 39 policies no total, nenhuma referenciando `public.users` inline (sem recursão; subqueries a `tenants` em policies SuperAdmin são seguras — RLS de tenants não recursivo).
- Constraints confirmadas via pg: tenants billing_status (paid/pending/overdue), plan (free/pro/enterprise), status (active/suspended); users role inclui mega_admin; sold_items status (valid/used) e type (token/ticket); orders status; cover type (entry/exit) e method (pix/credit/debit/cash); tables status.

## Build
- `tsc --noEmit` (npm run lint): OK.
- `vite build` (npm run build): OK (2208 módulos; warning de chunk > 500 kB não bloqueia).

## Rasgos resolvidos (2026-09-10)
- **PIX real**: `src/lib/pixApi.ts` integra Asaas, MercadoPago, PagBank. PixTerminal e POS usam cobrança real via `payment_integrations` ativa. QR code exibido (imagem do provedor). Polling automático até aprovação.
- **Impressão real**: `src/lib/print.ts` padroniza cupons 80mm. Impressão implementada em POS, PixTerminal, BarTokens, TableService (cozinha), TableManager (conta), Events (ingresso com código).
- **Validation**: tab ingresso agora valida tickets.
- **OrderChat**: saiu mock; carrega e escuta `chat_messages` em tempo real.
- **POS code gen**: usa `SalesStore.generateCode()` com colisão check.

## Rasgos pendentes
- Validação visual em browser (login `superadmin@woobar.com`; painel `/tenants`, `/saas-users`, `/support-admin`, `/helpdesk`).
- Migrations `004`+`005` divergem de `schema.sql`; recomenda-se `006_consolidate_rls.sql`.
- Senha Postgres hardcoded em `scripts/migrate.cjs`.
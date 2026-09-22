# Woobar — Handoff

## Estado atual
- **RLS live funcional e não-recursivo** (era o bloqueio central). Toda query cliente passa por helpers `SECURITY DEFINER`; 39 policies; reprodução 100% ok por role via supabase-js (mega_admin global, tenant_admin/waiter isolados por tenant) com writes + cleanup.
- **Painel Super Admin funcional**: `/tenants` (TenantsList reescrito: criar/editar/suspender/excluir/detalhes), `/saas-users` (SaasUsers), `/support-admin` (SupportAdmin), `/helpdesk` (Helpdesk). Rotas com guarda `RoleRoute`; menu lateral apontando fora do catch-all.
- **Hooks convergidos** tenant_id + snake_case: store custom, useMenu, useCoverCharge, useOrders. `createOrder` gera `id` com `crypto.randomUUID()` (orders.id não tem default).
- **PIX real implementado**: `src/lib/pixApi.ts` com Asaas, MercadoPago, PagBank. PixTerminal e POS usam gateway ativo em `payment_integrations`. QR code real (base64 do provedor). Polling de status até aprovação.
- **Impressão real padronizada**: `src/lib/print.ts` com cupons 80mm. Implementada em POS, PixTerminal, BarTokens, TableService, TableManager, Events.
- **Chat real**: OrderChat substituiu mock por `chat_messages` + realtime (`postgres_changes`).
- **Validation**: ambos tabs (fichas e ingressos) funcionais.
- **tsc --noEmit** e **vite build** OK.

## Última aplicação na live
1. `supabase/migrations/004_saas_admin_rls.sql`
2. `supabase/migrations/005_rls_recursion_fix.sql`
3. (pipe do projeto já resintetiza `schema.sql` via `scripts/migrate.cjs`; estado atual é a união convergida dos dois — helpers duplicados coexistindo sem colisão)

## Próximo contexto
- Migrations `004`+`005` (get_user_role/get_user_tenant) + `schema.sql` (auth_role/is_saas_admin/current_tenant_id) fazem o mesmo trabalho com helpers diferentes. Recomenda-se migration única `006_consolidate_rls.sql` idempotente e remover 004/005/fix_rls do mapa — após validar com o maestro.
- Validação visual em browser: login `superadmin@woobar.com`, navegar painéis, criar restaurante, abrir chamado.
- Limpar segredo: senha Postgres hardcoded em `scripts/migrate.cjs` (e em scripts temporários de verificação).

## Riscos
- `schema.sql` (canônico) + migrations acumuladas divergem; pipeline `migrate.cjs` pode resintetizar policies a cada restart — hoje convergido, mas entropia editorial alta.
- Anon key no `.env`; não commitar `.env`.
- Testes de API usaram dados descartáveis com cleanup; sem lixo no banco (orders=0).
- PIX direto no frontend expõe API keys dos gateways no browser. Para produção, migrar chamadas para Supabase Edge Functions.
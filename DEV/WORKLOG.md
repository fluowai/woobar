# Woobar — Worklog

## 2026-09-10 (sessão atual — PIX real + impressão + botões quebrados)
- **Integração PIX real criada**: `src/lib/pixApi.ts` com suporte a Asaas, MercadoPago e PagBank. A `payment_integrations` (salva em Integrações) é consultada para criar cobranças PIX reais via API dos gateways. QR code real exibido (imagem base64 do provedor ou fallback). Polling de status a cada 3s, até 60 tentativas.
- **PixTerminal.tsx** refeito: saiu simulação fake. Agora cria cobrança real no gateway, exibe QR code real, faz polling e confirma automaticamente. Impressão de cupom PIX após aprovação.
- **POS.tsx** ajustado: PIX agora usa `createPixCharge` real; código de ficha usa `SalesStore.generateCode()` (com colisão check) ao invés de `Math.random`; impressão real de cupom de venda via `printReceipt`.
- **Impression real padronizada**: `src/lib/print.ts` com `printReceipt` (corte 80mm, monospace, CSS `@page size: 80mm auto`). Substitui todos os `window.print()` inline por utilitário central.
- **Impressão adicionada em**:
  - `BarTokens`: cupom de fichas com código
  - `TableService`: cupom de cozinha após envio do pedido
  - `TableManager`: cupom de conta ao fechar mesa (status dirty)
  - `Events`: cupom de ingresso com código(s) após compra
- **Validation.tsx corrigido**: tab "Ingressos" agora tem botão "Validar Ingresso" (antes só fichas funcionavam).
- **OrderChat.tsx corrigido**: saiu `MOCK_MESSAGES` hardcoded. Agora carrega mensagens reais de `chat_messages` via Supabase e escuta INSERT em tempo real com `postgres_changes`.
- **tsc --noEmit**: OK. **vite build**: OK (2208 módulos).

## 2026-09-09 (sessão atual — auditoria de botões / painel super admin)
- **Recursão RLS reaberta e corrigida na live.** Verificação REST via `@supabase/supabase-js` (Bearer anon) mostrou `infinite recursion detected in policy for relation users` em TODAS as tabelas — o estado pré-sessão NÃO estava convergido. Causa: policies com subquery inline a `public.users` + policy de isolamento de `users` auto-referente.
- Criada `004_saas_admin_rls.sql` (mega_admin/super_admin em orders, cover, tables, events, categories, courier_positions, chat_messages, sold_items, menu, payment/support) e `005_rls_recursion_fix.sql` (drop-all + recriação via helpers `SECURITY DEFINER get_user_role/get_user_tenant`). Ambas aplicadas na live. Estado final não-recursivo confirmado por `pg_policies`.
- Helpers confirmados na live (sem colisão): `auth_role`, `is_mega_admin`, `is_super_admin`, `is_saas_admin`, `current_tenant_id`, `current_reseller_id` (schema.sql) + `get_user_role`, `get_user_tenant` (005).
- Super admin panel funcional: `TenantsList` reescrito (Novo Restaurante com modal, editar, suspender/reativar com confirmação, excluir, detalhes, stats, toast); novas páginas `SaasUsers` (/saas-users), `SupportAdmin` (/support-admin), `Helpdesk` (/helpdesk); rotas registradas com guarda de papel (`RoleRoute`) em `App.tsx`.
- Crashes corrigidos: `MainLayout` usava `<User>` sem import; rotas mortas do menu (/saas-users, /support-admin, /helpdesk caíam no catch-all).
- Hooks convergidos (tenant_id + snake_case): `lib/store.ts` (addItem), `useMenu.createItem`, `useCoverCharge`, `useOrders` (createOrder agora gera `id` client-side com `crypto.randomUUID()`; updates usam `updated_at`; map snake_case). Novo `lib/tenant.ts` (`resolveTenantId`/`DEMO_TENANT_ID`/`clearTenantIdCache`).
- Botões que não faziam nada: `Delivery` "Finalizar Pedido" -> fluxo de pedido real com modal; `Waiter/TableService` "Enviar" -> persiste pedido (`orders`, Mesa N); `Integrations` "Salvar Credenciais" -> upsert em `payment_integrations`; `Users` "Novo Usuário" -> modal de convite (criação de auth user exige service role).
- Gates: `tsc --noEmit` e `vite build` OK (2206 módulos).

## 2026-09-09 (sessão anterior)
- **Multi-tenant + RLS live fix.** Causa do 500 no dashboard: recursão infinita em policies de `users` (003_mega_admin self-reference `public.users` dentro de policies de `public.users` -> `42P17`).
- Adicionados helpers `SECURITY DEFINER` (auth_role/is_mega_admin/is_super_admin/is_saas_admin/current_tenant_id/current_reseller_id) em `schema.sql`, `003_mega_admin.sql`, `003_multi_tenant_features.sql`, `004_saas_admin_rls.sql`; policies reescritas sem subconsulta a `public.users`.
- `schema.sql`: guarda de seed (`if exists (select 1 from auth.users)`) para evitar duplicate key em DB já populado.
- Aplicado na live: 003 -> 004 -> schema.sql (migrate.cjs). Probe REST das 14 tabelas: 200.
- Frontend: criado `src/lib/tenant.ts`; `AuthContext.tenantId`; corrigido `store.ts markAsUsed` (`used_time`), `CoverCharge.tsx` inserts com `tenant_id`, `api.ts` (snake_case + tenant_id, código morto).
- Hooks (useMenu/useCoverCharge/useOrders) já convergidos por edição paralela: verificado.
- Gates: `npm run lint` (tsc --noEmit) e `npm run build` OK.
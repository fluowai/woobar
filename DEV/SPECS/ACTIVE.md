# Woobar — Specs / Active

## Tarefa: testar todas as funções do sistema e corrigir as quebradas (concluído)
- **Status:** Concluído.
- **Escopo:** percorrer todas as telas/botões, tornando funcionais os fluxos usando o Supabase; PIX real; impressão real; sem mock data.
- **Bloqueio encontrado e resolvido:** RLS com `infinite recursion` em `public.users` via anon key em TODAS as tabelas — o dashboard nunca funcionou de verdade. Corrigido aplicando `004_saas_admin_rls.sql` + `005_rls_recursion_fix.sql` (helpers `SECURITY DEFINER`, policies sem subconsulta a `users`).
- **Aceite (concluído):**
  - [x] Painel Super Admin: TenantsList (CRUD), SaasUsers, SupportAdmin, Helpdesk
  - [x] Rotas novas e guardadas por papel (`RoleRoute`); menu lateral sem dead links
  - [x] MainLayout sem crash (`User` import)
  - [x] Writes com tenant_id + snake_case (store, useMenu, useCoverCharge, useOrders; orders.id client-side)
  - [x] Delivery checkout, TableService "Enviar", Integrations salvar, Users convite
  - [x] Verificação fim-a-fim por role via supabase-js (reads + writes + cleanup) na live
  - [x] `tsc --noEmit` e `vite build` sem erros
  - [x] PIX real: PixTerminal e POS usam `payment_integrations` ativa (Asaas/MercadoPago/PagBank) com polling de status
  - [x] Impressão real: cupons 80mm via `printReceipt` em POS, PixTerminal, BarTokens, TableService, TableManager, Events
  - [x] Validation: tabs fichas e ingressos funcionais
  - [x] OrderChat: mensagens reais do banco (`chat_messages`) + realtime
  - [x] POS code generation usa `SalesStore.generateCode()` com colisão check
- **Fora de escopo (próximas):** reconciliação de migrations (`006_consolidate_rls.sql`); remoção de `api.ts` morto; segredo do `migrate.cjs`; migrar PIX para Edge Functions (segurança de API keys).
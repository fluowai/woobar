# Worklog

## 2026-10-01 — Hub multi-plataforma (Fase 2)

### Adicionado
- **Adapter Rappi** (`server/src/services/rappi/`): auth OAuth por `client_id/client_secret`
  (token 7 dias), client com `getNewOrders`, `getSentOrders`, `takeOrder`, `rejectOrder`,
  `readyForPickup`, `getEvents`, mapper defensivo, polling de 20s com atualização de status
  por eventos e webhook assinado.
- **Adapter 99Food** (`server/src/services/food99/`): auth client_credentials, client com
  `getOrder`/`updateOrderStatus` (paths configuráveis), mapper defensivo e webhook assinado.
- **Sync de saída** (`server/src/services/outbound.ts`): ao mudar status no painel,
  o status é empurrado para a plataforma (iFood confirm/startPreparation/readyToPickup/
  dispatch/requestCancellation; Rappi take/ready/reject; Uber accept/deny; 99Food POST status).
- Rotas de webhook `/webhook/rappi/:channelId` e `/webhook/food99/:channelId`.
- UI `src/pages/Channels.tsx`: ícones, cores, nomes, campos de config e URLs de webhook
  para Rappi e 99Food; campo `store_id` para Uber.

### Corrigido
- `channel_orders.status` não aceitava `'pending'` (violava o CHECK ao receber eventos do
  iFood) — CHECK ampliado.
- `channels.type` não aceitava `rappi`/`food99` — CHECK ampliado.
- Migração automática em `server/src/db/schema.ts` (`migrateConstraints`/`rebuildTable`)
  que recria as tabelas preservando dados quando o CHECK está desatualizado.
- iFood: endpoints migrados para `/order/v1.0/orders:polling` e
  `/order/v1.0/orders:acknowledgment` com fallback para `/event-polls/...`; códigos de
  evento modernos (`CONFIRMED`, `READY_TO_PICKUP`, `SEPARATION_STARTED`...) mapeados;
  removido `PATCH /orders/{id}/status` (endpoint inexistente).
- Uber: `PATCH /eats/orders/{id}/status` (inexistente) substituído por
  `accept_pos_order`/`deny_pos_order`; webhook agora trata `orders.notification` e
  `orders.cancel` e usa `X-Uber-Signature`.
- Webhook iFood não deduplicava (estourava o índice único) e não criava o pedido canônico —
  agora delega para `handleIfoodEvent`.
- Verificação de assinatura agora usa o corpo raw (`express.json({ verify })`).
- `PRAGMA foreign_keys` desativado apenas durante a migração de tabelas.

### Revisão manual (pós-implementação, mesmo dia)
- `ifood/client.ts`: `pollEvents`/`getOrder` agora só aceitam resposta em array/objeto
  com `id` (evita que um `202` vazio vire "pedido" ou evento inválido).
- `rappi/polling.ts`: auto-aceite (`takeOrder`) virou opcional via `config.auto_accept === true`;
  removida chamada duplicada a `readyForPickup` no polling (inbound agora só reflete status;
  ação de saída fica com `outbound.ts`).
- `routes/channels.ts`: webhook genérico legado deduplica `external_id` (retorna `duplicate`
  em vez de violar o índice único).
- `rappi/mapper.ts`: tipagem explícita do customer (`RappiCustomer`) para evitar erro de
  união com `{}` no typecheck.

### Pendência de verificação
- Shell do ambiente travou durante a sessão (todo comando estoura timeout, inclusive em
  subagente). Typecheck/build **não** rodaram — comandos em `DEV/VERIFY.md`.

### Por que
Execução da Fase 2 do plano de painel único de pedidos (ver `DEV/SPECS/ACTIVE.md`).

## 2026-10-03 — Hierarquia de usuários (superadmin / dono / equipe)

### Adicionado
- **Novos papéis**: `superadmin`, `waiter` (garçom) e `pantry` (copa), somando 8 papéis
  (`superadmin, admin, manager, waiter, kitchen, pantry, courier, attendant`).
  Fonte única em `server/src/lib/roles.ts` (`ROLES`, `ROLES_SQL`, `isRole`).
- Migração do CHECK de `users` em `server/src/db/schema.ts` (`CHECK_REWRITES.users`),
  reaproveitando `migrateConstraints`/`rebuildTable` — dados preservados.
- `roleGuard` agora deixa `superadmin` passar em qualquer guarda de `admin`
  (`server/src/middleware/auth.ts`).
- `GET /api/users` sem filtro de tenant quando o chamador é `superadmin`;
  `POST /api/users` aceita `establishment_id` opcional (só superadmin, validado);
  `PATCH /api/users/:id` valida `role` (400 em papel inválido);
  `PATCH /api/users/:id/location` aceita `superadmin`.
- `POST /api/auth/register` usa o tenant do chamador (superadmin pode informar
  `establishment_id`) em vez de `LIMIT 1` cego.
- **Seed idempotente** `npm run seed:users` (`server/src/db/seed-users.ts`):
  cria superadmin, dono, gerente, garçom, copa e mantém cozinha/entregadores/atendente;
  não reescreve senha de usuário já existente; cria o establishment `woobar` se faltar.
- Frontend: `UserRole` e `ROLE_LABELS` (pt-BR) em `src/data/users.ts`; `RoleBadge` de
  `src/pages/Users.tsx` cobre os 8 papéis (antes quebrava com papéis novos/`attendant`).

### Corrigido
- `src/lib/api.ts:98`: `JSON.stringify(data }` quebrava o scan do Vite (faltava `)`).
- `server/src/services/rappi/mapper.ts:39`: `address?.complete_address` no ramo em que
  `address` é `undefined` → TS2339 (`type never`). Pré-existente; virou `undefined`.

### Verificado
- `cd server && npx tsc --noEmit` e `npm run build` OK; `npm run lint` e `npm run build` OK.
- Migração: `users.role` com os 8 papéis no `sqlite_master`, 33 tabelas e 9 usuários intactos.
- Login testado (superadmin/admin/garçom); garçom recebe 403 em `POST /api/users`;
  superadmin lista 9 usuários (inclui ele, sem tenant) e admin os 8 do seu tenant.
- `npm run seed:users` duas vezes → 2ª execução: 0 criados / 9 mantidos.

### Por que
Pedido do dono para separar plataforma (superadmin) × dono do restaurante × equipe
operacional (garçom, copa, gerente, cozinha, entregador, atendente).

## 2026-10-09 � Plano de producao (Fases 1-4)

### Fase 1 � Seguranca backend
- RBAC em todas as rotas (`roleGuard` com bypass so de superadmin), `canAssignRole` (so superadmin atribui superadmin).
- Preco sempre server-side via `server/src/lib/pricing.ts` (orders/tokens/events/cover).
- Tenant scoping em users/orders/tables/inventory/channels/whatsapp/products/customers/financial/marketing.
- `establishment_settings`/`cover_config` por `establishment_id` + migracao.
- CSP + HSTS no `app.ts`, healthcheck com DB, broadcasts WS por tenant.

### Fase 2 � Frontend funcional
- Infra: `src/lib/auth.tsx`, `ErrorBoundary`, `Toast`, `MainLayout` com menu por papel, `App.tsx` com `RequireRole`, pagina `Login`.
- Todas as telas mock conectadas a API: Users, CoverCharge, QRMenu, Delivery, DeliveryManager, CourierView, OrderChat, Channels, WhatsAppPage, POS, BarTokens, KDS.
- `@types/react@^19` devDeps (typecheck cego resolvido).

### Fase 3 � Infra/Deploy
- `.env.production` limpo, `.dockerignore` corrigido (build do Vite precisa do env).
- `docker-compose.yml`: rede `woobar_net`, `depends_on` com healthcheck, `JWT_SECRET` obrigatorio.
- `docs/DEPLOY.md`: Portainer passo a passo, TLS, backups, seed, atualizacao, checklist.

### Fase 4 � Testes
- Suite ampliada de 7 para 43 testes (pricing/orders/operations) cobrindo as correcoes de seguranca.
- `vitest.config.ts` com `maxWorkers: 2` (estabilidade no Windows).
- Validacao final: lint, tsc server, testes, build:all, compose config � todos **OK**.

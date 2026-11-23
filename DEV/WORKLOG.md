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

## 2026-10-27 - Diagnóstico Completo, Correções e E2E Testing

### Corrigido
- server/src/lib/validate.ts: schemas.addTableOrderItem exigia obrigatoriamente product_name e price, quebrando a adição de itens quando apenas product_id era enviado. Corrigido com .refine() para permitir itens por product_id com preços calculados pelo servidor.
- server/test/printing-and-tables.test.ts: corrigidas asserções e adicionados testes de impressão de pedidos e comandas de mesa (12/12 testes passando).
- src/layouts/MainLayout.tsx: adicionado link para /settings/printing (Impressão) no menu mobile gaveta.

### Adicionado
- **Impressão de Pedidos e Comandas de Mesa** (server/src/routes/printing.ts):
  - POST /api/printing/order/:id: Gera buffer ESC/POS formatado para cupom de delivery/balcão com cliente, endereço, itens e totais.
  - POST /api/printing/table-order/:id: Gera cupom de conferência de consumo da mesa com itens, mesa e totais.
- **Frontend API** (src/lib/api.ts): Funções printOrder e printTableOrder.
- **UI de Impressão**:
  - src/pages/TableManager.tsx: Botão \"Imprimir Conta\" para emissão de conferência antes do fechamento.
  - src/pages/DeliveryManager.tsx: Botão de impressão de comanda para despacho na cozinha.
- **Teste End-to-End Automatizado** (DEV/test-e2e.ts):
  - Suíte completa com 36 testes integrados testando todos os módulos operacionais (login, mesas, comandas, pedidos delivery, chat, fichas de bar, validação, eventos, ingressos, couvert artístico, insumos de estoque, fila de impressão e agente local, abertura/fechamento de caixa e totem/cardápio digital público).
  - Resultado: **36 aprovados, 0 falhas**.

### Verificação
- 
pm test --prefix server: 6 arquivos, 55/55 testes unitários/integração **OK**.
- 
pm run lint (tsc web): 0 erros **OK**.
- cd server && npx tsc --noEmit: 0 erros **OK**.
- 
px tsx DEV/test-e2e.ts: 36/36 verificações E2E **OK**.
- Servidores locais ativos: API em http://localhost:3001 e Web em http://localhost:3000.

## 2026-10-27 — Análise de Produção e Auditoria de Prontidão

### Corrigido
- 	sconfig.json: adicionado "include": ["src"] para delimitar o escopo de compilação do frontend web e evitar que scripts utilitários em DEV/ causem falsos erros no 
pm run lint.
- DEV/test-e2e.ts: removido import não utilizado de ./src/lib/api.js.

### Adicionado
- DEV/PRODUCTION-READINESS.md: documento analítico detalhado com a matriz de prontidão por módulo, bloqueantes (P0), pendências de alta prioridade (P1), roadmap pós-go-live (P2) e checklist completo de implantação.

### Verificação
- 
pm run lint (tsc web): 0 erros **OK**.
- 
pm run build:all (Vite + backend): bundle de produção gerado com sucesso **OK**.
- 
pm test --prefix server: 6 arquivos, 55/55 testes unitários/integração **OK**.

## 2026-10-27 — Implementação do Módulo Fiscal NFC-e (Bloqueante P0)

### Adicionado
- **Schema & Migrações** (server/src/db/schema.ts):
  - Tabela iscal_settings: armazenamento de dados do emitente (CNPJ, IE, CRT, UF, código IBGE do município, endereço), credenciais do certificado A1 (cert_pfx_base64, cert_password), tokens SEFAZ (csc, csc_id), série, controle atômico de numeração de notas (last_number) e flag uto_emit_on_closing.
  - Tabela iscal_invoices: histórico completo de notas emitidas, status (utorizada, cancelada, ejeitada, erro), chaves de 44 dígitos (ch_nfe), protocolo, XML protocolado, URL de QR Code SEFAZ e motivos de erro/rejeição.
  - Colunas tributárias em products: 
cm (8 dígitos), cfop (4 dígitos), csosn, origin e unit, com migração automática via PRAGMA table_info.
- **Serviço Fiscal Backend** (server/src/services/fiscal.ts):
  - Integração HTTP autenticada com sidecar PHP (X-Fiscal-Token).
  - checkFiscalStatus: diagnóstico da SEFAZ estadual.
  - emitNfceForOrder e emitNfceForTableOrder: montagem do payload tributário (NCM, CFOP, CSOSN, pagamentos SEFAZ '01', '03', '04', '17', consumidor com CPF) e incremento atômico de número.
  - cancelNfce: evento de cancelamento oficial na SEFAZ (com justificativa de 15 a 255 chars).
  - uildDanfeDocument e uildDanfeEscpos: geração de cupom DANFE NFC-e com QR Code térmico e chave de acesso.
- **Rotas Fiscais** (server/src/routes/fiscal.ts):
  - GET /api/fiscal/settings e PUT /api/fiscal/settings (protegido por RBAC admin).
  - GET /api/fiscal/status: consulta de serviço SEFAZ em tempo real.
  - GET /api/fiscal/invoices e GET /api/fiscal/invoices/:id/xml: listagem e download de XMLs protocolados.
  - POST /api/fiscal/emit-order/:id e POST /api/fiscal/emit-table-order/:id.
  - POST /api/fiscal/invoices/:id/cancel e POST /api/fiscal/invoices/:id/print.
- **Frontend** (src/pages/FiscalPage.tsx, src/lib/api.ts, src/App.tsx, src/layouts/MainLayout.tsx):
  - Nova tela completa de gestão fiscal e SEFAZ com abas de Configurações & Certificado e Histórico de Notas Emitidas.
  - Upload de arquivo .pfx com conversão automática para base64 no navegador.
  - Status SEFAZ em tempo real com indicador visual (Produção / Homologação).
  - Tabela de notas com ações para impressão de DANFE, download do XML protocolado e modal de cancelamento de NFC-e.
  - Rota /fiscal e item de menu em MainLayout.tsx sob o grupo FINANCEIRO (restrito a dmin e manager).
- **Suíte de Testes Automatizados** (server/test/fiscal.test.ts):
  - 6 testes cobrindo autenticação, bloqueio de garçom (403), consulta e persistência de dados fiscais (sem expor senha do certificado), validação Zod, isolamento multi-tenant e formatação de DANFE ESC/POS.

### Verificação
- 
pm test --prefix server: 7 arquivos, 61/61 testes unitários/integração **OK** (100% de aprovação).
- cd server && npx tsc --noEmit: 0 erros **OK**.
- 
pm run lint (tsc web): 0 erros **OK**.
- 
pm run build:all: build de produção frontend e backend gerado com sucesso **OK**.


## 2026-11-05 � Homologa��o Completa para Go-Live e Baterias de Testes de Produ��o

### Verifica��o e Testes
- Executada su�te completa do Vitest no backend: 67/67 testes aprovados sem falhas.
- Executado typechecking do frontend (tsc --noEmit): 0 erros.
- Executada compila��o de produ��o Vite: 62 chunks gerados com sucesso em dist/.
- Executada compila��o TypeScript do backend: server/dist gerado com sucesso.
- Criado e executado script DEV/test-full-production.ts testando o ciclo completo de produ��o: cadastros de novos produtos reais com dados fiscais (NCM, CFOP, CSOSN, UN), altera��o de pre�o, abertura de caixa, atendimento de comanda com c�lculo server-side, impress�o t�rmica ESC/POS, venda e baixa de fichas com prote��o contra reutiliza��o fraudulenta, pedidos delivery, Totem de autoatendimento e apura��o de DRE.
- Subidos e validados os servi�os em localhost (porta 3000 e 3001), ambos respondendo HTTP 200.
- Criado relat�rio detalhado de Go-Live em DEV/PRODUCTION-GO-LIVE-2026-11-05.md.



## 2026-11-05 � Implementa��o Completa do M�dulo SaaS & Painel Master

### Adicionado
- Schema SaaS: Criadas tabelas saas_plans e saas_subscriptions com planos padr�es (Starter R$ 97, Pro R$ 197, Enterprise R$ 349).
- Backend SaaS Routes (server/src/routes/saas.ts): m�tricas globais de MRR e GMV, CRUD de tenants, altera��o de planos, bloqueio por inadimpl�ncia, impersonation para suporte t�cnico e auto-onboarding p�blico.
- Middlewares de Plano (server/src/middleware/plan.ts): checkSubscription e requirePlanFeature.
- Frontend Master SaaS (src/pages/SaasMaster.tsx): tela executiva com cards de MRR, total de lojas, assinantes ativos, controle de status, modal de cria��o e suporte ao cliente.
- Auto-Onboarding P�blico (src/pages/RegisterTenant.tsx): tela p�blica em /cadastrar com 14 dias de trial gr�tis para novos bares e restaurantes.
- Navega��o Master no MainLayout com acesso exclusivo para o papel superadmin.
- Bateria de testes DEV/test-saas.ts executada com 14/14 testes aprovados.


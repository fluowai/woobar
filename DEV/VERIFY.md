# Verificação

## Comandos

```bash
# Backend (typecheck + build)
cd server && npx tsc --noEmit && npm run build

# Frontend (typecheck + build)
npm run lint
npm run build
```

## Resultados

| Data | Comando | Resultado |
|---|---|---|
| 2026-10-01 | `cd server && npx tsc --noEmit` | **PENDENTE** — shell do ambiente travado durante a sessão (nenhum comando retornou); rodar localmente |
| 2026-10-01 | `npm run lint` | **PENDENTE** — idem |
| 2026-10-01 | `npm run build` | **PENDENTE** — idem |
| 2026-10-03 | `cd server && npx tsc --noEmit` | **OK** (após corrigir `rappi/mapper.ts:39`, erro pré-existente) |
| 2026-10-03 | `npm run lint` | **OK** |
| 2026-10-03 | `npm run build:all` | **OK** (vite 1m20s + `tsc` do server) |
| 2026-10-03 | `npm run seed:users` | **OK** — 4 criados / 5 mantidos; 2ª execução 0/9 (idempotente) |
| 2026-10-03 | login + `GET /api/users` (superadmin/admin/garçom) | **OK** — 9 vs 8 usuários; garçom 403 em `POST /api/users` |

## Checklist manual pós-typecheck

1. `npm run dev:all` sobe web (3000) e API (3001).
2. Login → **Marketplace de Canais** → Novo Canal → escolher **Rappi** ou **99Food**.
3. Preencher `config_json` (client_id/client_secret/store_id + URLs) e salvar.
4. Ativar o canal → log deve mostrar `Starting Rappi polling` (Rappi) no console da API.
5. Webhook: `POST http://localhost:3001/api/channels/webhook/<type>/<channelId>` com header
   `x-webhook-signature` = HMAC-SHA256 hex do corpo usando o `webhook_secret` do canal.
6. Receber um pedido → ele deve aparecer em `orders` + `channel_orders` e no Kanban/KDS.
7. Mudar status no painel → conferir no log da API a chamada de saída para a plataforma.

## Migração de banco

Ao subir, `initDatabase()` detecta CHECKs antigos (`channels.type` sem `rappi`/`food99`,
`channel_orders.status` sem `pending` e `users.role` sem `superadmin`/`waiter`/`pantry`) e
recria as tabelas com backup temporário, preservando os dados. Verificar no log que não há
erro de `SQLITE_CONSTRAINT`.

## Seed de usuários

```bash
npm run seed:users   # idempotente: cria/atualiza sem reescrever senhas existentes
```


## 2026-10-09 � Validacao final (Plano de Producao Fases 1-4)

| Comando | Resultado |
|---|---|
| `npm run lint` (tsc web) | **OK** |
| `cd server && npx tsc --noEmit` | **OK** |
| `cd server && npm test` | **OK** � 43/43 testes, 5 arquivos (auth, financial, pricing, orders, operations) |
| `npm run build:all` | **OK** � vite 55.9s + build do server (`server/dist/db/seed.js` gerado) |
| `docker compose config -q` (JWT_SECRET dummy) | **OK** |

### Cobertura nova de testes (Fase 4)
- `server/test/pricing.test.ts` � unitario: `canSetCustomPrice`, `canAssignRole`, `normalizeOrderItems` (preco servidor, produto inativo/fora do tenant, quantidade 1-999), `orderTotal`.
- `server/test/orders.test.ts` � integracao: preco adulterado ignorado, itens invalidos 400, isolamento de tenant (GET/PATCH), filtros, mensagens.
- `server/test/operations.test.ts` � tokens: preco servidor, preco manual so admin, roleGuard (kitchen 403), validate uma vez + usada, isolamento tenant; cover: config por tenant, entry com preco do config, roleGuards.

### Ajuste de infra de testes
- `server/vitest.config.ts`: `maxWorkers: 2` � 5 forks simultaneos no Windows estouravam timeout/`fetch failed` (auth/financial falhavam apenas em paralelo).

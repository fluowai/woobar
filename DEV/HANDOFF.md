# Handoff

## O que foi feito

- Fase 2 do hub de canais: adapters **Rappi** e **99Food**, sync de status de saída
  (`services/outbound.ts`), fixes de iFood/Uber e suporte na UI.
- **Hierarquia de usuários**: papéis `superadmin`/`waiter` (garçom)/`pantry` (copa),
  `roleGuard` com bypass de superadmin, seed idempotente `npm run seed:users`
  (superadmin + dono + gerente + garçom + copa) e labels pt-BR no `RoleBadge`.

Detalhes: `DEV/WORKLOG.md`. Contrato: `DEV/SPECS/ACTIVE.md`.

## Estado

- Código implementado e revisado.
- **Typecheck/build OK** (2026-10-03): `cd server && npx tsc --noEmit`, `npm run lint`,
  `npm run build:all`. Ver `DEV/VERIFY.md`.
- Seed de usuários rodado no DB de dev (9 usuários).

## Credenciais de dev (seed:users)

| Papel | Email | Senha |
|---|---|---|
| superadmin (sem tenant) | `superadmin@woobar.com` | `Super1234` |
| admin (dono) | `admin@woobar.com` | `admin123` |
| garçom / copa / gerente | `pedro@` / `fernanda@` / `roberto@woobar.com` | `123456` |
| cozinha / entregador / atendente | `carlos@` / `marcos@`,`julia@` / `ana@woobar.com` | `123456` |

## Atenção

- A tela `/users` continua **mock** (não lista os usuários reais) — só o `RoleBadge` foi
  atualizado. Conectar `api.getUsers`/`createUser` é passo seguinte.
- Endpoints da **99Food** não são públicos: `auth_url`, `api_url`, `status_path` e
  `order_path` são configuráveis por canal justamente para ajustar sem deploy.
  Confirmar no portal do desenvolvedor 99Food.
- Uber Eats usa `/v1/eats/store/{storeId}/orders/{orderId}/accept_pos_order` —
  exige `store_id` na config; confirmar scopes na aprovação do app.
- iFood: polling tenta `/order/v1.0/orders:polling` e cai para
  `/event-polls/v1.0/events/polling` se o novo retornar erro (compatibilidade).

## Próximos passos sugeridos

1. Conectar a tela **Equipe & Acessos** (`/users`) à API (listar/criar/editar) — hoje é mock.
2. Guardas por role no frontend (menu/rotas escondidas por papel) — só o backend protege.
3. Testar homologação iFood (requisitos em `DEV/SPECS/ACTIVE.md`).
4. Fase 3: sync de cardápio bidirecional (preço/disponibilidade/abertura) para todas as
   plataformas; relatórios por canal com comissão real.
5. Fase 4: PedidosYa/DiDi (fora do BR), Entrega Sob Demanda.

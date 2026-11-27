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
| admin (dono) | `admin@woobar.com` | definida por `SEED_ADMIN_PASSWORD` |
| garçom / copa / gerente | `pedro@` / `fernanda@` / `roberto@woobar.com` | definida por `SEED_STAFF_PASSWORD` |
| cozinha / entregador / atendente | `carlos@` / `marcos@`,`julia@` / `ana@woobar.com` | definida por `SEED_STAFF_PASSWORD` |

## Atenção

- A tela `/users` está conectada à API real para listar, criar, editar e ativar/desativar
  usuários. Validar o fluxo visual em navegador antes do go-live.
- Endpoints da **99Food** não são públicos: `auth_url`, `api_url`, `status_path` e
  `order_path` são configuráveis por canal justamente para ajustar sem deploy.
  Confirmar no portal do desenvolvedor 99Food.
- Uber Eats usa `/v1/eats/store/{storeId}/orders/{orderId}/accept_pos_order` —
  exige `store_id` na config; confirmar scopes na aprovação do app.
- iFood: polling tenta `/order/v1.0/orders:polling` e cai para
  `/event-polls/v1.0/events/polling` se o novo retornar erro (compatibilidade).

## Próximos passos sugeridos

1. Testar o fluxo visual da tela **Equipe & Acessos** (`/users`) em navegador.
2. Testar homologação iFood (requisitos em `DEV/SPECS/ACTIVE.md`).
4. Fase 3: sync de cardápio bidirecional (preço/disponibilidade/abertura) para todas as
   plataformas; relatórios por canal com comissão real.
5. Fase 4: PedidosYa/DiDi (fora do BR), Entrega Sob Demanda.

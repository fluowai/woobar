**DATABASE_PLAN.md**

# Plano de evolução do banco de dados (Supabase/PostgreSQL)

## 1. Schema atual (resumo)
- `users` (id, name, email, role, status, avatar, current_location, is_available, created_at, updated_at)
- `menu_items` (id, name, description, price, category, image, is_available, created_at, updated_at)
- `categories` (id, name, display_order)
- `sold_items` (id, code, item_name, item_id, price, purchase_time, status, type, order_id)
- `orders` (id, customer, customer_phone, items JSONB, total, status, time, address, location JSONB, courier_id, payment_method, notes, created_at, updated_at)
- `cover_charge_transactions` (id, type, amount, method, timestamp)
- `tables` (id, name, seats, status, orders JSONB, created_at, updated_at)
- `events` (id, title, date, time, location, image, tickets JSONB, created_at, updated_at)
- `courier_positions` (id, courier_id, lat, lng, timestamp)
- `chat_messages` (id, order_id, sender, message, timestamp)

Todas as tabelas têm RLS habilitado; políticas públicas de leitura em `menu_items`, `sold_items`, `events`, `tables`.

## 2. Gaps identificados
| Tabela | Gap | Solução proposta |
|--------|-----|-------------------|
| `users` | `role` string livre, sem ENUM; falta `tenant_id` opcional para admins. | Alterar coluna `role` para `ENUM('mega_admin','super_admin','tenant_admin','waiter','kitchen','courier','cashier','manager')`; garantir `tenant_id` nullable. |
| `menu_items` | Não há variações/complementos. | Criar tabelas `menu_variations` (sku, name, price_adjust, tenant_id) e `menu_addons` (name, price_adjust, tenant_id). |
| `orders` | Falta vínculo a `tables` e `kitchen_station`. | Adicionar colunas `table_id` (FK tables) e `kitchen_station` ENUM. |
| `tables` | `orders` armazenado JSON, sem histórico de splits/join. | Normalizar em tabela `table_orders` (id, table_id, order_id, status, created_at). |
| `events` | `tickets` armazenado como JSONB, sem lotes, quotas, cupons. | Criar tabelas `event_tickets` (id, event_id, name, price, quota, available), `event_lots` (id, event_id, start_at, end_at, price), `event_coupons` (id, event_id, code, discount). |
| `sold_items` | Mistura de tokens e tickets, sem controle de uso único. | Separar em `tokens` (cashless) e `event_tickets` (FK events). |
| **Novas funcionalidades** | — | Criar tabelas: `reservations`, `inventory`, `suppliers`, `purchase_orders`, `cashless_wallets`, `audit_logs`. |
| **Índices** | Falta índices compostos para consultas multi‑tenant. | Criar índices: `idx_orders_tenant_status`, `idx_events_tenant_date`, `idx_inventory_product`, `idx_audit_logs_tenant`. |

## 3. Migrações planejadas (ordem)
1. `003_normalize_roles.sql` – altera `users.role` para ENUM, cria índice `idx_users_role` atualizado.
2. `004_add_variations_and_addons.sql` – cria `menu_variations`, `menu_addons`, atualiza RLS.
3. `005_refactor_orders.sql` – adiciona `table_id`, `kitchen_station`; cria tabela `table_orders`.
4. `006_create_event_ticket_tables.sql` – cria `event_tickets`, `event_lots`, `event_coupons`.5. `007_create_inventory_tables.sql` – cria `inventory`, `suppliers`, `purchase_orders`.
6. `008_create_reservation_table.sql` – cria `reservations`.
7. `009_create_cashless_wallet.sql` – cria `cashless_wallets` e `audit_logs`.
8. `010_update_rls_policies.sql` – refina RLS para tabelas novas e restringe leitura pública de `sold_items` e `events`.

Cada migration inclui **UP** e **DOWN** scripts e atualiza políticas RLS correspondentes.

## 4. Estratégia de migração
- **Backup**: `pg_dump` das tabelas críticas antes de aplicar cada migration.
- **Zero‑downtime**: criar colunas novas antes de remover as antigas; migrar dados em lote.
- **Testes**: ambiente staging clonado da produção; rodar todas migrations e validar integridade com scripts de teste.
- **Rollback**: scripts `DOWN` incluídos; caso falhe, executar rollback imediato.
- **Feature‑flag rollout**: novos módulos são ativados por tenant após migração e teste, permitindo rollout gradual.

---
*Este plano será usado nas fases de implementação subsequentes.*
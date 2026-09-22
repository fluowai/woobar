**MIGRATION_PLAN.md**

# Estratégia de migração de dados e esquema

## 1. Ferramental
- **Supabase Migration CLI** – todos os scripts SQL devem ser aplicados via migrações numeradas.
- **pg_dump / pg_restore** – para backups de segurança.

## 2. Fluxo de migração
1. **Ambiente Staging** – a migração é aplicada primeiro em um clone do banco de produção.
2. **Validação de esquema** – execução de testes automatizados para garantir que chaves, índices e RLS estão corretos.
3. **Data Migration** – para mudanças estruturais (ex.: normalização de JSONB), executar scripts de `INSERT INTO ... SELECT` ou `UPDATE` em lote.
4. **App Rollout** – atualização do frontend para usar as novas tabelas/colunas; suporte a ambas (old/new) se necessário durante transição curta.
5. **Clean-up** – remoção de colunas/tabelas depreciadas após confirmação de sucesso em produção.

## 3. Backups e Rollback
- **Backup preventivo**: dump das tabelas críticas (`users`, `orders`, `sold_items`, `events`) antes de alterações destrutivas.
- **Script de DOWN**: cada migração deve ter seu correspondente `DOWN.sql` para reversão rápida.
- **Monitoramento**: logs do Supabase e erros do frontend acompanhados imediatamente após migração.

## 4. Cronograma de migrações (sugerido)
- `003_normalize_roles.sql` (P0)
- `004_add_variations_and_addons.sql` (P1)
- `005_refactor_orders_tables.sql` (P1)
- `006_create_event_ticket_tables.sql` (P2)
- `007_create_inventory_tables.sql` (P2)
- `008_create_reservation_table.sql` (P3)
- `009_create_cashless_wallet_table.sql` (P3)
- `010_audit_log_and_security_refinement.sql` (P0)

---
*Este plano garante integridade dos dados durante a evolução do sistema.*
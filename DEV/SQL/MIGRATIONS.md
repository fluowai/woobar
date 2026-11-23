# Woobar — Migrations (mapeamento)

| Arquivo | Aplica | Papel |
|---|---|---|
| `schema.sql` | live via `scripts/migrate.cjs` | Canônico; guarda de seed; helpers `auth_role/is_mega_admin/is_super_admin/is_saas_admin/current_tenant_id/current_reseller_id`; policies não-recursivas; seeds feature |
| `supabase/migrations/003_mega_admin.sql` | manual | Hierarquia revendas (`resellers`, `reseller_id`, rôle `mega_admin`); policies de infra não-recursivas |
| `supabase/migrations/003_multi_tenant_features.sql` | manual | Feature tables + seeds + policies "SaaS admins manage X" / tenant isolation |
| `supabase/migrations/004_saas_admin_rls.sql` | manual (aplicado live) | RLS padrão feature tables + payment/support; self-contained com helpers; mega_admin/super_admin |
| `supabase/migrations/005_rls_recursion_fix.sql` | aplicado live | Drop-all + recriação de 39 policies via helpers `SECURITY DEFINER get_user_role/get_user_tenant` — resolveu a recursão real na live |

## Ordem de aplicação em DB já existente
003 -> 004 -> 005 -> (pipe do projeto resintetiza `schema.sql` via `scripts/migrate.cjs`).

## Observações
- **Estado live (2026-09-09):** convergido e não-recursivo (39 policies; nenhuma subconsulta a `public.users`). 100% verificado por role via supabase-js.
- **Redundância a reconciliar:** 005 (`get_user_role`/`get_user_tenant`) + `schema.sql` (`auth_role`/`is_saas_admin`/`current_tenant_id`) fazem o mesmo trabalho com funções diferentes; ambas coexistem sem colisão. Proposta futura: migration única `006_consolidate_rls.sql` idempotente e remoção de 004/005/`fix_rls.cjs` do mapa — validar com o maestro.
- Live já está convergida (após ordem acima).
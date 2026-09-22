**SECURITY_REPORT.md**

# Relatório de auditoria de segurança e mitigação

## 1. Riscos identificados (Estado atual)
| Área | Risco | Impacto | Mitigação recomendada |
|------|-------|---------|------------------------|
| **RLS - Leitura pública** | Tabelas `sold_items`, `events`, `tables` possuem política `SELECT USING (true)`, expondo dados de pedidos, eventos e tokens a qualquer usuário autenticado. | Médio/Alto | Restringir `SELECT` a `tenant_id` ou papéis autorizados; validar `auth.uid() = tenant_id` onde possível. |
| **Roles não tipados** | `users.role` é string livre; permite atribuição de valores arbitrários e escalonamento de privilégios. | Alto | Alterar para ENUM tipado no DB; validar na camada API e via políticas RLS. |
| **Secrets expostos** | Uso de `env-config.js` para chaves sensíveis (PIX, Google Maps) – risco de vazamento no bundle do cliente. | Alto | Migrar chaves sensíveis para variáveis de ambiente do Supabase/Edge Functions; nunca expor no bundle. |
| **Falta de auditoria** | Ações críticas (descontos, cancelamentos, abertura de caixa) não possuem registro imutável. | Médio | Criar tabela `audit_logs` com triggers de banco para capturar mudanças críticas. |
| **XSS** | Campos de texto (descrição de menu, nome de evento) não possuem sanitização explícita na persistência ou renderização. | Alto | Implementar sanitização com `DOMPurify` e usar renderização segura; preferir Markdown. |
| **CSRF / IDOR** | Chamadas diretas à API Supabase dependem apenas de JWT; risco de manipulação de IDs (`order_id`, `user_id`) se o tenant não for validado no servidor. | Médio | Garantir que todas as políticas RLS filtram por `tenant_id` e que o backend (RLS) valida o dono do recurso. |
| **QR Replay** | Tickets e tokens (`sold_items`) podem ser reutilizados se a validação não for atômica. | Alto | Validação atômica: `UPDATE sold_items SET status='used' WHERE code=? AND status='valid' RETURNING *`. |
| **Webhooks vulneráveis** | Falta verificação de assinatura em webhooks de pagamento (PIX, Stripe). | Médio | Validar assinatura HMAC em todas as rotas webhook de terceiros. |

## 2. Recomendações imediatas (P0)
1. **Refinar RLS** – remover leitura pública de `sold_items` e `events`; restringir a membros do tenant.
2. **Normalizar roles** – migrar para ENUM e atualizar todas as políticas RLS para usá-lo.
3. **Mover secrets** – chaves de API PIX e outras sensíveis devem sair do frontend.
4. **Implementar sanitização** – garantir que nenhum input do usuário seja renderizado como HTML sem tratamento.

## 3. Conformidade
- O projeto deve seguir as melhores práticas de **OWASP Top 10**.
- **Tenant Isolation** é o requisito principal de segurança.

---
*Este relatório guiará as atividades de segurança em todas as fases de implementação.*
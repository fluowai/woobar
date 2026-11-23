**IMPLEMENTATION_PLAN.md**

# Plano de implementação incremental (P0-P3)

## 1. Roadmap de fases
| Fase | Escopo | Módulos | Entregáveis | Prioridade |
|------|--------|---------|-------------|------------|
| **F0 – Clean-up** | Remover dependências mortas (`express`), validar RLS, criar feature‑flags service | core, auth | `npm audit fix`, docs auditados, CI passa | P0 |
| **F1 – Core Harden** | Normalizar roles (ENUM), melhorar RLS, implementar auditoria básica | core/users, core/tenant | Migração `003_normalize_roles.sql`, testes unitários | P0 |
| **F2 – Food – Menu & Variations** | Criar `menu_variations`, `menu_addons`; UI admin de variações | food/menu | API CRUD + UI de gerenciamento | P1 |
| **F3 – Orders & Tables Refactor** | Adicionar `table_id` em orders, normalizar `table_orders`, suporte a split/join | food/orders, tables | UI de gerência de mesas, API orders atualizada | P1 |
| **F4 – KDS** | Implementar Kitchen Display System usando Supabase Realtime | food/kds | Tela de cozinha funcional, WebSocket listener | P2 |
| **F5 – Inventory** | Módulo de estoque, BOM (ficha técnica), fornecedores, alertas de estoque baixo | inventory | API + UI básica de controle de estoque | P2 |
| **F6 – POS Enhancements** | Multi‑payment, integração de gateways (Stripe, MercadoPago), abstração de impressão | pos/payments, pos/printers | Checkout atualizado, integração com impressoras | P2 |
| **F7 – Reservations** | Sistema de reserva de mesa com calendário e confirmação | food/reservations | UI de reserva, integração com mesas | P3 |
| **F8 – Events & Ticketing** | Lotes, quotas, cupons, geração de QR tickets (Pretix compatible) | events, ticketing | Checkout de ingressos, gerador de QR | P3 |
| **F9 – Access & Cashless** | Scanner offline (PretixScan based), wallet ledger, saldo interno | access/wallet, access/qr | Mobile web scanner, saldo wallet | P3 |
| **F10 – CRM & Loyalty** | Histórico 360 do cliente, programa de pontos, segmentação | crm, loyalty | Dashboard do cliente, métricas de fidelidade | P3 |
| **F11 – Fiscal (Brasil)** | Camada fiscal desacoplada para NFC‑e/NFC‑e (implementação própria) | finance/fiscal | Documentação + stub de API fiscal | P3 |
| **F12 – Analytics & Reporting** | Dashboards unificados, KPIs unificados (DRE, LTV, ocupação) | analytics | Relatórios PDF/CSV exportáveis | P3 |
| **F13 – Security Hardening** | Auditoria final RLS, rate‑limiting, sanitização XSS, testes de penetração | core/security | Relatório de conformidade final | P0 (contínuo) |

## 2. Metodologia de trabalho por fase
1. **Design** – definir requisitos funcionais e técnicos da fase.
2. **Implementação** – desenvolver código (React + TS) seguindo a arquitetura modular.
3. **Migração DB** – aplicar scripts SQL e RLS necessários via Supabase migration.
4. **Testes** – unitários e de integração (frontend/backend).
5. **Revisão de Código** – validar padrões e segurança.
6. **Deploy em Staging** – testar em ambiente isolado antes de produção.
7. **Documentação** – atualizar `README.md`, `ARCHITECTURE.md`, `DECISIONS.md`.

## 3. Priorização imediata
1. **F0 & F1** – garantem a estabilidade e segurança do core SaaS.
2. **F2, F3 & F4** – fundamentais para operação de restaurante/bar.
3. **F5** – controle financeiro/operacional.
4. **F8, F9 & F10** – expansão para eventos e entretenimento.

---
*Este plano será executado de maneira incremental e monitorada.*
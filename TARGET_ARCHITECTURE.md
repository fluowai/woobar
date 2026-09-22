**TARGET_ARCHITECTURE.md**

# Visão geral da arquitetura alvo (Woobar Food & Entertainment)

## 1. Princípios
- **Modularidade por feature** – cada domínio (core, food, pos, inventory, events, access, crm, finance, analytics) reside em um diretório `modules/` independente.
- **Ativação por tenant** – via feature‑flags definidas em `core/config/featureFlags.ts` e armazenadas no perfil do tenant (plan = free/pro/enterprise).
- **Multi‑tenant forte** – todas as tabelas de domínio possuem `tenant_id`; políticas Row‑Level Security (RLS) garantem isolamento total.
- **Supabase‑first** – uso do Supabase como BaaS (Auth, Realtime, Storage) evitando backend próprio. Quando necessário, Edge Functions ou pequenos micro‑services podem ser adicionados.
- **Reatividade em tempo real** – KDS, status de mesa e eventos de checkout são transmitidos via Supabase Realtime.
- **Camada de integração** – provedores de pagamento (PIX, Stripe, MercadoPago, etc.) são plug‑ins TypeScript que seguem a interface `PaymentProvider`.
- **Segurança por‑design** – políticas RLS, sanitização de inputs, rate‑limiting, auditoria de ações críticas.
- **UI única** – React 19 + Tailwind 4 mantém visual consistente; nenhum framework UI externo impõe estilo.

## 2. Estrutura de diretórios (pós‑refatoração)
```
modules/
├─ core/                # Auth, Tenant, Users, Config (feature flags)
│   ├─ auth/
│   ├─ tenant/
│   ├─ users/
│   └─ config/
├─ food/                # Cardápio, Pedidos, Mesas, Reservas, KDS
│   ├─ menu/
│   ├─ orders/
│   ├─ tables/
│   ├─ reservations/
│   └─ kds/
├─ pos/                 # Vendas, Caixa, Pagamentos, Impressão
│   ├─ sales/
│   ├─ cash/
│   ├─ payments/
│   └─ printers/
├─ inventory/           # Produtos, Insumos, Estoque, Compras, Fornecedores
├─ events/               # Eventos, Ingressos, Lotes, Cupons, Check‑in, Promoters
├─ access/              # QR, Wallet, Gate control, Offline sync
├─ crm/                 # Clientes, Histórico 360°, Fidelidade, Campanhas
├─ finance/             # Contas a pagar/receber, Conciliação, Fiscal (BR), Relatórios
├─ analytics/           # Dashboards, Insights (LTV, ocupação, ticket médio)
└─ shared/              # UI components, hooks, utils, types
```

## 3. Fluxos críticos
1. **Login** → Supabase Auth → `TenantContext` resolve `tenant_id` → Feature flags carregadas.
2. **Criação de pedido** → UI → `useOrders` → `orders` inserido → **Realtime** notifica KDS e mesas.
3. **KDS** → Susbcribe ao canal `tenant_{id}_kitchen` → atualiza status (NEW → PREPARING → READY).
4. **Pagamento** → `payments` plug‑in escolhe provider (PIX/Stripe) → registro em `cover_charge_transactions`.
5. **Evento → Ticket** → Usuário compra ingresso → `event_tickets` gera QR → `checkin` valida QR (online ou offline) → marca como `used`.
6. **Cashless** → Usuário carrega saldo → transação gravada em `cashless_wallets` (ledger imutável).

## 4. Integrações externas
- **Supabase** (Auth, Realtime, Storage).
- **Google Maps / Leaflet** – visualização de delivery.
- **Payment Gateways** – módulos TypeScript para PIX (Banco Central), Stripe, MercadoPago, Asaas.
- **PrintNode / ESC/POS** – abstração `PrinterService` para impressão.
- **Webhooks** – eventos de pagamento, webhook de eventos externos, auditoria.

## 5. Estratégia de implantação
- **Monorepo** → código da aplicação front‑end + módulos TypeScript.
- **CI/CD** → GitHub Actions executa `npm run lint`, `tsc --noEmit`, testes unitários e, em CI, roda migrações Supabase.
- **Deploy** → Vite build para static site hospedado no Supabase Edge Functions ou Netlify; backend mantido no Supabase.

---
*Este documento servirá de guia de referência para todas as fases de implementação subsequentes.*
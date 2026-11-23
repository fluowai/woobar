**DUPLICATION_REPORT.md**

| Área | Funcionalidade | Estado Woobar | Projeto(s) externo(s) | Decisão |
|------|----------------|---------------|----------------------|---------|
| POS / Caixa | Fluxo completo de PDV, múltiplos pagamentos, fechamento | Parcial (`sold_items`, `cover_charge_transactions`) | OSPOS, FloreantPOS (POS completo) | **EXTEND_EXISTING** – melhorar fluxo usando conceitos MIT de OSPOS. |
| Mesas / Comandas | Mesa, status, split/join | Básico (`tables` + `TableOrder`) | FloreantPOS (mesas avançadas) | **REFactor_EXISTING** – refatorar modelo de mesa para incluir splits e transferências. |
| KDS | Kitchen display em tempo real | ❌ | TastyIgniter, FloreantPOS (KDS) | **NEW_MODULE** – construir KDS inspirado em Floreant/TastyIgniter (MIT). |
| Inventário | Stock, insumos, BOM | ❌ | OSPOS, LibrePOS (estoque) | **NEW_MODULE** – criar módulo inventory inspirado em OSPOS (MIT). |
| Compras / Fornecedores | Ordem de compra, cadastro fornecedor | ❌ | ERPNext, OSPOS (compras) | **NEW_MODULE** (usar ideias de OSPOS, que é MIT). |
| Reservas | Reserva de mesas horária | ❌ | TastyIgniter (booking) | **NEW_MODULE** – adaptar fluxo de booking (MIT). |
| Eventos / Ticketing | Eventos, ingressos, lotes, cupons | Básico (`events`, `sold_items`) | Hi.Events, Pretix (ticketing) | **EXTEND_EXISTING** – manter base, acrescentar lotes, cupons usando Pretix (Apache‑2.0). |
| QR Check‑in | Scanner de ingresso, validação offline | ❌ | PretixScan (Android/iOS/Desktop) | **NEW_MODULE** – implementar scanner inspirado em PretixScan (Apache‑2.0). |
| Promotores / Afiliados | Links exclusivos, comissão | ❌ | Attendize, Hi.Events (referral) | **NEW_MODULE** – usar modelo MIT de Attendize. |
| Cashless / Wallet | Saldo interno, QR/NFC, ledger | ❌ | Pretix (wallet), Alf.io (cashless) | **NEW_MODULE** – base MIT/Apache. |
| Fiscal (BR) | NFC‑e, SAT, contingência | ❌ | ERPNext (Fiscal BR) – **GPL** | **DO_NOT_USE** – estudar apenas para requisitos, implementar próprio conforme lei. |
| Relatórios avançados | BI, dashboards, analytics | Básico | OSPOS, ERPNext, Pretix (analytics) | **EXTEND_EXISTING** – enriquecer a partir de dados existentes usando libs de visualização (ex.: Chart.js). |

**Resumo:**
- **KEEP_EXISTING** – funcionalidades já consolidadas (auth, tenant, menu básico, orders, events). 
- **EXTEND_EXISTING** – POS, events, reports.
- **REFactor_EXISTING** – mesas/comandas.
- **NEW_MODULE** – KDS, inventory, purchases, reservations, scanner, cashless, promoters.
- **DO_NOT_USE** – código GPL (fiscal).
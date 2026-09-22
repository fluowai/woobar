**FEATURE_MATRIX.md**

| Função | Woobar (atual) | TastyIgniter | OSPOS | FloreantPOS | ERPNext | Hi.Events | Pretix | Attendize | Alf.io |
|--------|----------------|--------------|-------|-------------|---------|-----------|--------|-----------|-------|
| Auth / Multi‑tenant | Supabase RLS | Laravel + multi‑tenant | Laravel (single) | Java (single) | Frappe (multi) | JWT + multi‑tenant | Django (multi) | Laravel (multi) | Spring (multi) |
| Menu / Cardápio | `menu_items` (simples) | Full menu com variações, complementos, schedules | Básico | Básico | Produto + BOM | – | – | – | – |
| Pedidos | `orders` (status, items) | Online + unidade + horário | POS order flow | Mesa → comanda → cozinha | Sales Order | – | – | – | – |
| Mesas / Comandas | `tables` + `TableOrder` | Mesa + reserva + floorplan | – | Mesa + KDS, split checks | – | – | – | – | – |
| KDS | ❌ | ✅ (KDS UI) | ❌ | ✅ (real‑time) | ❌ | ❌ | ❌ | ❌ | ❌ |
| POS / Caixa | `sold_items`, `cover_charge_transactions` | POS integrado | ✅ completo | ✅ completo | – | – | – | – | – |
| Estoque / Inventário | ❌ | ✅ (stock per variant) | ✅ | ✅ | ✅ | – | – | – | – |
| Compras / Fornecedores | ❌ | ✅ | ✅ | ✅ | ✅ | – | – | – | – |
| Reservas | ❌ | ✅ (booking) | ❌ | ❌ | ✅ (booking) | – | – | – | – |
| Eventos / Ticketing | Básico (`events` + `sold_items`) | ❌ | ❌ | ❌ | ❌ | ✅ (full lifecycle) | ✅ (full ticketing) | ✅ (ticketing) | ✅ (ticketing) |
| QR Check‑in | ❌ | ✅ (QR menu) | ❌ | ❌ | ✅ (QR) | ✅ (QR check‑in) | ✅ (QR scanner) | ✅ (QR) | ✅ (QR) |
| Promotores / Afiliados | ❌ | ❌ | ❌ | ❌ | ✅ (Referral) | ✅ (Referral) | ✅ (Referral) | ✅ (Referral) | ✅ (Affiliate) |
| Cashless / Wallet | ❌ | ❌ | ❌ | ❌ | ✅ (Payment) | ✅ (Payment) | ✅ (Payment) | ✅ (Payment) | ✅ (Payment) |
| Fiscal (BR) | ❌ | ❌ | ❌ | ❌ | ✅ (Fiscal docs) | ❌ | ❌ | ❌ | ❌ |
| Relatórios / Dashboards | Básico (`Dashboard.tsx`) | Avançado (analytics) | Relatórios POS | Relatórios POS | BI avançado | Relatórios eventos | Relatórios tickets | Relatórios tickets | Relatórios tickets |
| API / Webhooks | Supabase client | Laravel API | Laravel API | Java API | Frappe REST | REST + webhooks | Django REST + webhooks | Laravel API | Spring REST |
| Licença | MIT | MIT | GPL‑3.0 | GPL‑3.0 | GPL‑3.0 | MIT | Apache‑2.0 | MIT | Apache‑2.0 |

**Observação:** Só projetos MIT/Apache‑2.0 são reutilizáveis; GPL‑3.0 projetos (OSPOS, FloreantPOS, ERPNext) servirão apenas como inspiração.

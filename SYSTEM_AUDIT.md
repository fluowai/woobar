**SYSTEM_AUDIT.md**

### 1️⃣ Stack tecnológica
| Camada | Tecnologia | Versão (aprox.) | Observação |
|--------|------------|-----------------|------------|
| **Frontend** | React 19, Vite 6, TypeScript 5.8, Tailwind 4, Lucide‑react, Motion, React‑router‑dom 7, React‑leaflet, @google/genai | ✓ | UI única, sem framework CSS adicional |
| **Backend / API** | Supabase JS client 2 (REST + Realtime) – **Express removido** | ✓ | CRUD direto ao Supabase |
| **Banco** | PostgreSQL (Supabase) | ✓ | Schema em `supabase/migrations/*.sql` |
| **ORM / Client** | Supabase client (sem ORM) | ✓ | Tipos TS em `src/lib/database.types.ts` |
| **Auth** | Supabase Auth (JWT) – `supabase.auth.getUser()` | ✓ | Resolução de `tenant_id` via `src/lib/tenant.ts` |
| **State** | React Context (`AuthContext`, `TenantContext`) + custom hooks (`useMenu`, `useOrders`, …) | ✓ | Estado global no cliente |
| **Infra** | Vite dev server (`npm run dev` – porta 1507) | ✓ | Nenhum Dockerfile presente |
| **Fila/Jobs** | **Nenhum** identificado | – | Possível uso futuro do Supabase Realtime |
| **Cache** | Supabase client cache (local) | – | Sem camada de cache externa |
| **Serviços externos** | Google Maps API, Leaflet, Google Generative AI (`@google/genai`) | – | Usados em componentes de mapa e IA |

### 2️⃣ Arquitetura atual
```
woobar/
├─ public/                # assets, env-config.js
├─ src/
│  ├─ components/         # UI widgets (DeliveryMap, OrderChat, BarTokens, …)
│  ├─ contexts/           # AuthContext, TenantContext
│  ├─ data/               # seed data (menu.ts, users.ts)
│  ├─ hooks/              # business‑logic hooks (useMenu, useOrders, useCoverCharge, …)
│  ├─ layouts/            # MainLayout
│  ├─ lib/
│  │   ├─ api.ts          # CRUD wrappers over Supabase tables
│  │   ├─ database.types.ts
│  │   ├─ supabase.ts
│  │   ├─ tenant.ts
│  │   ├─ pixApi.ts, print.ts, store.ts, utils.ts
│  ├─ pages/              # roteamento por papel (SuperAdmin, MegaAdmin, POS, Waiter, Settings, Events)
│  ├─ App.tsx, main.tsx
├─ supabase/
│  └─ migrations/         # 001_initial_schema.sql, 002_rls_policies.sql, …
├─ package.json
└─ vite.config (implícito)
```

**Módulos críticos**
- **AuthContext / TenantContext** – sessão Supabase e resolução de `tenant_id`.
- **API layer (`api.ts`)** – CRUD genérico para `users`, `menu_items`, `orders`, `sold_items`, `tables`, `events`.
- **Hooks** – encapsulam chamadas API e lógica de UI (`useOrders`, `useCoverCharge`, etc.).
- **Pages** – UI por papel (SuperAdmin, MegaAdmin, POS, Waiter, Settings, Events).
- **Supabase migrations** – criação de tabelas, índices e políticas RLS.

**Acoplamentos**
- **Tenant‑aware** – maioria das tabelas contém `tenant_id`; isolamento depende das políticas RLS (`002_rls_policies.sql`).
- **Roles** – strings livres (`admin`, `manager`, `kitchen`, `courier`). Não há enum tipado.
- **Frontend ↔ Supabase** – comunicação direta, sem camada de serviço.
- **Express** estava listado como dependência, mas foi removido (não utilizado).

### 3️⃣ Modelo SaaS atual
- **Multi‑tenant** – tabelas chave (`menu_items`, `orders`, `sold_items`, `tables`, `events`, etc.) contêm `tenant_id`.
- **RLS** – políticas permitem leitura pública em alguns recursos (`menu_items`, `sold_items`, `events`, `tables`) e escrita apenas para usuários autenticados (`auth.role() = 'authenticated'`).
- **Fallback tenant** – `FALLBACK_TENANT_ID` usado quando admin/super‑admin não possui `tenant_id`.
- **Risco** – leitura pública de `sold_items` e `events` pode expor códigos de token ou detalhes sensíveis a qualquer usuário autenticado; recomenda‑se revisão.

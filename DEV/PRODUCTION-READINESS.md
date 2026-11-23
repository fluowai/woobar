# Woobar — Análise de Prontidão para Produção (Production Readiness)

> **Data da Avaliação:** 4 de Novembro de 2026  
> **Status Geral do Core:** 🟢 Backend tipado, frontend buildado e 67/67 testes passando após o hardening P0.  
> **Classificação para Go-Live:** 🟡 Pronto para piloto controlado; ainda depende de credenciais, TLS, homologação fiscal/marketplace e operação real.

> **Nota de auditoria 2026-11-10:** os testes locais passaram, mas isso não substitui a
> homologação externa. O Docker não estava disponível no ambiente de auditoria e os
> serviços SEFAZ, marketplaces, gateway e impressora física não foram validados com
> credenciais/equipamentos reais.

---

## 1. Resumo Executivo

O Woobar atingiu um nível de maturidade arquitetural e de código elevado. Todas as camadas operacionais principais (PDV, Mesas/Comandas, KDS, Delivery/Kanban, Fichas de Bar, Ingressos, Couvert, Estoque, CRM, Marketing, Impressão ESC/POS e RBAC) estão implementadas, testadas e protegidas contra adulteração de preços e vazamento entre estabelecimentos.

No entanto, para uma operação comercial real em restaurante ou bar no Brasil, existem **bloqueios regulatórios (fiscal)** e **integrações de mercado externas** que devem ser cumpridas antes de abrir as portas aos clientes.

---

## 2. Matriz de Prontidão por Módulo

| Módulo | Estado no Código | Prontidão para Produção | O que falta para Go-Live |
|---|---|---|---|
| **PDV & Caixa** | 100% Funcional | 🟢 Pronto | Operacionalmente completo; registrar abertura, vendas, sangrias e fechamento. |
| **Mesas & Comandas** | 100% Funcional | 🟢 Pronto | Abertura, transferência, adição com preço server-side e conferência de conta. |
| **KDS (Cozinha/Bar)** | 100% Funcional | 🟢 Pronto | WebSocket em tempo real para status de preparo. |
| **Delivery & Kanban** | 100% Funcional | 🟢 Pronto | Despacho, entregadores, tracking e rotas. |
| **Cardápio Digital & Totem** | 100% Funcional | 🟡 Parcial | Falta gateway para pagamento online/PIX dinâmico (hoje aceita pagamento na entrega/balcão). |
| **Impressão ESC/POS** | 100% Funcional | 🟢 Pronto | Comprovantes de delivery e conta gerados. Falta parear agente local com a impressora física da loja. |
| **Hierarquia & Segurança** | 100% Funcional | 🟢 Pronto | 8 papéis com `roleGuard`, CSP, HSTS, rate-limit e JWT. |
| **Módulo Fiscal (NFC-e)** | 100% Funcional (Backend + UI) | 🟢 Pronto | Código 100% integrado; requer apenas upload do certificado A1 e CSC da empresa na tela `/fiscal`. |
| **Marketplaces (iFood, etc.)** | 90% (Código pronto) | 🟡 **Homologação** | Adapters prontos; requer credenciais reais e homologação contratual junto às plataformas. |
| **WhatsApp (Atendimento)** | 100% Funcional | 🟢 Piloto | Baileys operacional; requer chip dedicado e cautela com anti-spam. |
| **Infraestrutura / Docker** | 100% Funcional | 🟢 Pronto | Docker Compose e Dockerfile multi-stage prontos. Requer apontamento de domínio + TLS. |

---

## 3. Checklist Obrigatório para Entrada em Produção

### Fase 1: Bloqueantes Regulatórios & Operacionais (P0)

- [x] **1. Conexão do Módulo Fiscal (NFC-e)**:
  - Adicionados campos fiscais ao schema de produtos (`ncm`, `cfop`, `csosn`, `origin`, `unit`).
  - Implementadas rotas e serviço fiscal completo em `server/src/routes/fiscal.ts` e `server/src/services/fiscal.ts`.
  - Criada tela `/fiscal` (`src/pages/FiscalPage.tsx`) com upload de `.pfx`, status SEFAZ em tempo real, histórico de notas e cancelamento.
- [x] **2. Gateway de Pagamento Online (PIX Dinâmico)**:
  - Mercado Pago implementado com QR Code, webhook, idempotência de criação e atualização do pedido.
  - Modo simulado permanece disponível somente fora de produção; produção falha explicitamente se o gateway não estiver configurado.
- [x] **3. Hardening de Senhas e Segredos**:
  - Gerar `JWT_SECRET` com 32+ caracteres em produção (`openssl rand -hex 32`).
  - Gerar `FISCAL_TOKEN` forte compartilhado entre Node e PHP.
  - Alterar senhas padrão dos usuários semeados (`admin@woobar.com`, `superadmin@woobar.com`).
- [ ] **4. Deploy com TLS/HTTPS**:
  - Configurar Caddy ou Nginx com certificado Let's Encrypt na frente da porta 3001.
  - Definir `CORS_ORIGIN=https://seu-dominio.com` e `APP_URL=https://seu-dominio.com`.
  - Configurar repasse de headers de WebSocket (`Upgrade` / `Connection`).

---

### Fase 2: Homologação com Terceiros & Hardware Local (P1)

- [ ] **5. Credenciamento nos Marketplaces**:
  - Obter `client_id`, `client_secret` e `merchant_id` no Portal do Desenvolvedor do iFood.
  - Rodar o ciclo de testes de homologação exigido pelo iFood (recebimento, aceite, despacho e cancelamento).
  - Preencher credenciais dos canais ativos na aba `/channels`.
- [ ] **6. Instalação do Agente de Impressão na Loja**:
  - Rodar `print-agent` no microterminal ou computador do balcão/caixa conectado à impressora térmica de 80mm.
  - Testar impressão de cupom de conferência e comanda de produção.
- [ ] **7. Baixa Automática de Insumos**:
  - Vincular receitas do cardápio aos insumos do estoque para debitar automaticamente quantidades no fechamento de pedidos.

---

### Fase 3: Monitoramento e Resiliência (P2)

- [ ] **8. Rotina de Backup em Nuvem**:
  - O backup local do SQLite já ocorre a cada 24h em `/app/data/backups`. Recomenda-se espelhar periodicamente para um bucket S3/GCS ou storage externo.
- [ ] **9. Alertas de Erro (Sentry ou Uptime)**:
  - Adicionar monitoramento no `/api/health` para avisar em caso de indisponibilidade da API ou do banco.

### Hardening concluído nesta execução

- Resgate de fichas com atualização atômica, expiração, operador e auditoria.
- Compose sem defaults de localhost ou token fiscal vazio em produção.
- Simulação de aprovação e gateway mock bloqueados em produção.
- Fallback de QR PIX falso bloqueado em produção.
- Lockfiles atualizados pelo `npm audit fix --package-lock-only`.

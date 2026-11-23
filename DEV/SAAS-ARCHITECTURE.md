# Woobar SaaS — Arquitetura de Multi-Tenancy e Gestão de Assinaturas

> **Data de Implementação:** 5 de Novembro de 2026  
> **Status:** 🟢 Operacional e Homologado (14/14 Testes SaaS Aprovados)  
> **Acesso Master:** `/saas` (Exclusivo para o papel `superadmin`)  
> **Auto-Onboarding Público:** `/cadastrar`

---

## 1. Visão Geral da Arquitetura

O Woobar foi transformado em uma plataforma **SaaS Multi-Tenant B2B** para comercialização e gestão de assinaturas recorrentes para bares, restaurantes, lanchonetes e casas noturnas.

A arquitetura opera com:
1. **Isolamento de Dados por Tenant**: Cada loja possui seu próprio `establishment_id`. O banco de dados isola pedidos, comandas, mesas, produtos, estoques, DRE e configurações.
2. **Camada de Planos & Assinaturas**:
   - Tabela `saas_plans`: Catálogo de planos com preços mensais/anuais, limites operacionais e matriz de features habilitadas.
   - Tabela `saas_subscriptions`: Controle de vigência, status (`trial`, `active`, `past_due`, `canceled`), renovação e data limite.
3. **Painel Master do Super Admin (`/saas`)**:
   - Controle financeiro com MRR (Monthly Recurring Revenue) consolidado em tempo real.
   - Listagem completa de estabelecimentos com métricas de consumo (mesas, usuários, produtos, pedidos).
   - Ação de **Suporte / Impersonation**: O Super Admin consegue gerar um token seguro de sessão para acessar o painel como administrador de qualquer cliente com 1 clique.
   - Ações de bloqueio/desbloqueio por inadimplência e alteração de planos.
4. **Auto-Onboarding Público (`/cadastrar`)**:
   - Novos clientes podem se cadastrar pelo site público, escolher seu plano e receber 14 dias de teste grátis imediatamente com mesas e categorias provisionadas.

---

## 2. Catálogo de Planos Pré-Configurados

| Plano | Preço Mensal | Preço Anual | Mesas | Usuários | Produtos | Módulos Inclusos |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Starter PDV** (`starter`) | R$ 97,00 | R$ 970,00 | 15 | 5 | 100 | PDV Balcão, Mesas, Cardápio QR, Relatórios básicos. |
| **Pro Bar & KDS** (`pro`) | R$ 197,00 | R$ 1.970,00 | 50 | 15 | 300 | Starter + KDS Cozinha/Bar, Fichas de Bar (Tokens), Estoque, WhatsApp, Delivery Kanban. *(Mais Vendido)* |
| **Enterprise & Fiscal** (`enterprise`) | R$ 349,00 | R$ 3.490,00 | 999 | 99 | 999 | Pro + Módulo Fiscal NFC-e SEFAZ, Totem de Autoatendimento, Portaria/Ingressos/Couvert, Hub iFood/Marketplaces. |

---

## 3. Endpoints da API SaaS

### A. Rotas Públicas
- `GET /api/saas/plans`: Retorna os planos ativos com limites e features para exibição em landing pages ou na tela de registro.
- `POST /api/saas/register`: Cria o estabelecimento, o usuário administrador e a assinatura trial de 14 dias automaticamente.

### B. Rotas Master (Super Admin)
- `GET /api/saas/metrics`: Retorna MRR consolidado, total de clientes, clientes ativos, em trial, inadimplentes e GMV transacionado nos últimos 30 dias.
- `GET /api/saas/tenants`: Lista todos os estabelecimentos com detalhes da assinatura e estatísticas de uso.
- `POST /api/saas/tenants`: Provisiona manualmente um novo estabelecimento definindo plano e dias de teste.
- `PATCH /api/saas/tenants/:id/status`: Suspende (`active: 0`, `past_due`) ou reativa uma loja com 1 clique.
- `PATCH /api/saas/tenants/:id/plan`: Altera o plano contratado, status ou estende o período de testes.
- `POST /api/saas/tenants/:id/impersonate`: Emite token JWT de acesso temporário para o Super Admin prestar suporte técnico dentro do painel daquela loja.

---

## 4. Como Acessar e Testar

1. **Painel Master do Super Admin**:
   - Acesse `http://localhost:3000`
   - Login: `superadmin@woobar.com` | Senha: `Super1234`
   - Clique em **"Gestão da Plataforma"** no menu lateral esquerdo (com ícone dourado ✨) ou navegue para `http://localhost:3000/saas`.
2. **Página de Cadastro de Novos Clientes**:
   - Acesse `http://localhost:3000/cadastrar`
   - Selecione um plano, preencha o nome do bar e teste o auto-onboarding em 2 minutos.


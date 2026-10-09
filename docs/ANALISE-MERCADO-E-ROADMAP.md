# Analise competitiva e roadmap do Woobar

Data da pesquisa: 14 de junho de 2026.

## Posicionamento dos concorrentes

### SAIPOS

A SAIPOS se posiciona como plataforma de gestao integral para food service. A oferta publica inclui PDV, mesas/comanda digital, KDS/Kanban, cardapio e site delivery, integracoes com marketplaces e pagamentos, estoque, ficha tecnica, CMV teorico e real, financeiro/fiscal, NFC-e, CRM, dashboard, app de gestao, app do entregador, roteirizacao, balanca/peso dinamico, SmartPOS e mais de 100 integracoes.

### Anota AI

A Anota AI se posiciona como automacao de vendas e atendimento. A oferta publica inclui robo com IA para WhatsApp, Facebook e Instagram, interpretacao de audio, cardapio digital, pagamento online, PDV, QR Code por mesa, app do garcom, KDS, estoque, NFC-e automatizada, financeiro, registro de compras, cupons, cashback, recuperador de vendas, agendamento de pedidos, pesquisa de satisfacao, integracao com anuncios e centralizacao de pedidos.

## O que o Woobar ja possui

- PDV, mesas/comandas, KDS, cardapio QR e gestao de pedidos.
- Delivery com Kanban, entregadores, mapas, despacho automatico e chat.
- Integracoes de canais com iFood, Uber, WhatsApp e webhooks.
- Estoque, movimentacoes, receitas/fichas tecnicas e custo por receita.
- Caixa, dashboard, DRE, produtos mais vendidos e indicadores.
- CRM, pontos de fidelidade e historico basico de clientes.
- Eventos, ingressos, validacao, fichas de bar e couvert artistico.
- Usuarios, perfis de acesso, auditoria, autenticacao e WebSocket.

## Gaps priorizados

| Prioridade | Gap | Referencia | Contexto de negocio | Estado |
|---|---|---|---|---|
| P0 | Campanhas segmentadas e recuperacao de inativos | Anota AI | Reativar a base propria reduz CAC e dependencia de marketplace | Implementado nesta etapa |
| P0 | Cupons e cashback | Anota AI | Aumenta recorrencia e permite medir campanhas | Implementado nesta etapa |
| P0 | Fiscal NFC-e/NF-e e tributacao | Ambos | Obrigatorio para operacao comercial em escala | Planejado |
| P0 | Pagamento online e conciliacao | Anota AI/SAIPOS | Reduz cancelamento e fecha o fluxo financeiro | Planejado |
| P1 | CMV real automatico e engenharia de cardapio | SAIPOS | Mostra margem real por item e orienta precificacao | Planejado |
| P1 | Compras, fornecedores e sugestao de reposicao | Ambos | Completa o ciclo de estoque e evita ruptura | Planejado |
| P1 | Agendamento de pedidos | Anota AI | Captura demanda futura e organiza producao | Planejado |
| P1 | Pesquisa de satisfacao e reputacao | Anota AI/SAIPOS | Fecha o ciclo de experiencia e avaliacao | Planejado |
| P1 | App/PWA do garcom e gestor | Ambos | Melhora mobilidade no salao e acompanhamento remoto | Planejado |
| P2 | Estoque preditivo com IA | SAIPOS | Preve consumo, perdas e compras | Planejado |
| P2 | Integracao com anuncios e pixel/conversoes | Anota AI | Mede aquisicao e retorno por campanha | Planejado |
| P2 | API publica, webhooks e marketplace de integracoes | SAIPOS | Acelera ecossistema e parcerias | Parcial |
| P2 | Multiunidade/franquias e consolidacao | SAIPOS | Necessario para expansao de redes | Planejado |

## Plano de implementacao

### Fase 1 - Growth e retencao

Central de Marketing, segmentacao de clientes, recuperacao de inativos, cupons, cashback, agendamento de campanhas e metricas de alcance. O primeiro nucleo foi implementado com persistencia e API. O envio automatico deve ser conectado aos provedores de WhatsApp/e-mail em uma iteracao seguinte.

### Fase 2 - Margem e suprimentos

Adicionar fornecedores, pedidos de compra, entrada por nota, inventario fisico, perdas, custo medio, CMV teorico x real e engenharia de cardapio. Cada venda deve baixar insumos pela ficha tecnica; cada inventario deve gerar variacao e custo real.

### Fase 3 - Fiscal e pagamentos

Integrar NFC-e/NF-e, contingencia, cancelamento, reimpressao, cadastro tributario de produtos, TEF/SmartPOS, PIX e cartao no cardapio. Criar conciliacao entre pedidos, adquirentes e caixa.

### Fase 4 - Experiencia e automacao

Adicionar agendamento de pedidos, pesquisa automatica pos-venda, recuperacao de carrinho, bot omnichannel, recomendacao de produtos e resposta a audio. Manter aprovacao humana e trilha de auditoria nas automacoes.

### Fase 5 - Escala

PWA de garcom/gestor, multiunidade, consolidacao de indicadores, metas, comparacao entre lojas, permissoes por unidade, API publica documentada e marketplace de integracoes.

## Fontes publicas

- SAIPOS: https://saipos.com/
- Anota AI: https://anota.ai/home/

As funcionalidades listadas refletem a oferta publica consultada na data acima. Recursos comerciais podem variar por plano, integracao e regiao.

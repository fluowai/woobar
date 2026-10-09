# Especificação Ativa — Hub de Canais de Delivery

## Objetivo

Painel único onde o dono do restaurante gerencia pedidos de **qualquer** plataforma
(iFood, Rappi, 99Food, Uber Eats, WhatsApp, site) sem trocar de tablet/tela.

## Arquitetura

```
Plataforma ──(webhook | polling)──> Adapter ──> NormalizedOrder ──> Orchestrator
                                                                        │
                                              orders + channel_orders + WS broadcast
                                                                        │
Painel (KDS/Orders) ──PATCH status──> outbound.ts ──> ação na plataforma
```

- Adapter por plataforma em `server/src/services/<plataforma>/`
  (`auth.ts`, `client.ts`, `mapper.ts`, tipos; `polling.ts` ou `webhook.ts`).
- Modelo canônico: `NormalizedOrder` em `services/types.ts`.
- Deduplicação: `channel_orders(channel_id, external_id)` UNIQUE.
- Status: `STATUS_MAP` (plataforma → woobar) e `REVERSE_STATUS_MAP` (woobar → plataforma).

## Canais suportados

| type | Recepção | Ações de saída |
|---|---|---|
| `ifood` | polling 15s (`/order/v1.0/orders:polling` com fallback `/event-polls/...`) | confirm, startPreparation, readyToPickup, dispatch, requestCancellation |
| `rappi` | polling 20s (`GET /orders`) + webhook | take, reject, ready-for-pickup |
| `food99` | webhook | POST status (paths configuráveis) |
| `uber` | webhook (`orders.notification`) | accept_pos_order, deny_pos_order |
| `whatsapp` | webhook | — |
| `website`/`facebook`/`instagram` | webhook genérico | — |

## Credenciais (config_json por canal)

- iFood: `client_id`, `client_secret`, `merchant_id`
- Rappi: `client_id`, `client_secret`, `store_id`, `auth_url`, `api_url`
- 99Food: `client_id`, `client_secret`, `store_id`, `auth_url`, `api_url`, `status_path`, `order_path`
- Uber: `client_id`, `client_secret`, `merchant_uuid`, `store_id`

## Webhooks

`POST /api/channels/webhook/<type>/<channelId>` com assinatura HMAC-SHA256 do corpo
(header `x-<plataforma>-signature`, `x-webhook-signature` ou `x-signature`).
Segredos aceitos: `webhook_secret` do canal, `config.webhook_secret`, `config.client_secret`.

## Restrições conhecidas

- iFood: confirmação em até 8 min; homologação obrigatória (CNPJ + app funcional).
- Uber Eats: NDA/licença + aprovação; aceite em até 11,5 min.
- 99Food: 1 integrador por loja; endpoints confirmáveis apenas no portal do desenvolvedor
  (paths são configuráveis justamente por isso).
- Rappi: acesso só via contato comercial; token vale 7 dias.

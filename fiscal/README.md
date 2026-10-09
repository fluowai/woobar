# Fiscal Sidecar (sped-nfe)

Microserviço PHP interno responsável pela emissão de **NFC-e (modelo 65)** usando a
biblioteca [nfephp-org/sped-nfe](https://github.com/nfephp-org/sped-nfe). Roda na mesma
stack autohospedada (docker-compose) e **não expõe porta para fora da rede interna** — o
Node (Woobar) fala com ele via HTTP autenticado por `FISCAL_TOKEN`.

## Endpoints

Todos (exceto `/health`) exigem o header `X-Fiscal-Token` = variável `FISCAL_TOKEN` e
método `POST` com JSON.

| Rota | Descrição |
|---|---|
| `GET /health` | Healthcheck (sem autenticação) |
| `POST /status` | Status do serviço da SEFAZ (`empresa` + `certificado`) |
| `POST /nfce/emitir` | Monta, assina (A1), gera QR Code e envia síncrono → XML protocolado |
| `POST /nfce/cancelar` | Evento de cancelamento (chave + protocolo + justificativa ≥ 15) |
| `POST /nfce/inutilizar` | Inutilização de faixa de numeração |

## Payload comum

```json
{
  "empresa": {
    "razaosocial": "BAR EXEMPLO LTDA",
    "cnpj": "12345678000190",
    "ie": "123456789",
    "crt": 1,
    "siglaUF": "SP",
    "ambiente": 2,
    "csc": "TOKEN_CSC_DA_SEFAZ",
    "cscid": "000001",
    "schemes": "PL_009_V4",
    "endereco": {
      "xLgr": "Rua A", "nro": "100", "xBairro": "Centro",
      "cMun": 3550308, "xMun": "São Paulo", "UF": "SP", "CEP": "01001000",
      "fone": "1199999999"
    }
  },
  "certificado": { "pfx_base64": "<base64 do .pfx>", "senha": "senha_do_a1" }
}
```

`nota` de `/nfce/emitir`:

```json
{
  "serie": 1, "numero": 123,
  "natOp": "VENDA AO CONSUMIDOR",
  "itens": [
    { "descricao": "Chopp Artesanal 500ml", "ncm": "22030000", "cfop": "5102",
      "unidade": "UN", "quantidade": 2, "valor_unitario": 18.5,
      "origem": 0, "csosn": "102" }
  ],
  "pagamentos": [ { "forma": "01", "valor": 37.0 } ],
  "destinatario": {}
}
```

`crt: 1` (Simples) usa `csosn` por item; demais regimes usam `cst` + `p_icms`/`v_icms`.

## Respostas

Sempre JSON com `status` (`autorizada` | `denegada` | `rejeitada` | `cancelada` |
`inutilizada` | `ok` | `erro`), `codigo` (cStat), `motivo`, e na emissão:
`chave`, `protocolo`, `xml` (procNFe), `qrcode` (URL do QR Code v3/v2).

XMLs autorizados são gravados em `FISCAL_STORAGE` (`/app/storage/a{ambiente}/{chave}.xml`).

## Desenvolvimento local

```bash
cd fiscal
composer install
FISCAL_TOKEN=devtoken php -S localhost:8080 -t public
# testar:
curl -s http://localhost:8080/health
```

## Docker

Build e execução acontecem pelo `docker-compose.yml` da raiz (serviço `fiscal`).
A porta 8080 só é `expose` (rede interna), nunca `ports`.

## Pré-requisitos para homologação/produção

1. Certificado digital **A1** (.pfx) do emitente.
2. **CSC** + **CSC ID** junto à SEFAZ do estado (obrigatório para o QR Code da NFC-e).
3. Dados fiscais: CNPJ, IE, regime (CRT), código do município (IBGE), CSC.
4. Confirmar a URL de consulta QR Code do seu estado em
   `vendor/nfephp-org/sped-nfe/storage/wsnfe_4.00_mod65.xml`.
5. `schemes`: `PL_009_V4` (padrão) ou `PL_010_V1.30` conforme exigência da UF (RTC).

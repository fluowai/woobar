# Stack Woobar — Portainer / WooTech

## Rede e domínio

Crie a rede Docker externa antes do deploy:

```bash
docker network create woo-network
```

Aponte o DNS `woobar.wootech.com.br` para o IP público do host Docker. O Caddy da stack termina o TLS automaticamente.

## Variáveis da stack

No Portainer, em **Environment variables**, configure:

```text
APP_DOMAIN=woobar.wootech.com.br
APP_URL=https://woobar.wootech.com.br
CORS_ORIGIN=https://woobar.wootech.com.br
JWT_SECRET=<segredo aleatório com pelo menos 32 caracteres>
FISCAL_TOKEN=<outro segredo aleatório com pelo menos 32 caracteres>
BACKUP_INTERVAL_HOURS=24
BACKUP_KEEP=14
```

Não coloque credenciais do Supabase, banco, JWT ou fiscal no arquivo versionado. O código atual usa SQLite no volume `woobar_data`; as variáveis Supabase recebidas não são consumidas por esta versão.

## Deploy e verificação

Use o `docker-compose.yml` deste repositório como arquivo da stack. Ele também pode ser colado diretamente no editor Web do Portainer. A imagem publicada é:

```text
ghcr.io/fluowai/woobar:main
```

Página do pacote no GitHub:
https://github.com/fluowai/woobar/pkgs/container/woobar

A rede está configurada como externa com o nome exato `woo-network`.

```bash
curl -fsS https://woobar.wootech.com.br/api/health
docker ps
docker logs woobar --tail 100
```

O healthcheck esperado contém `"status":"ok"` e `"db":true`.

As credenciais enviadas na conversa devem ser consideradas expostas. Revogue e gere novamente a senha do PostgreSQL e as chaves Supabase antes de reutilizá-las.

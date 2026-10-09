# Deploy — Woobar (Docker + Portainer)

Guia de produção para o stack completo: frontend (Vite) + API (Express) + sidecar fiscal (PHP) em um único host com Portainer.

---

## 1. Pré-requisitos

- Host com Docker Engine + plugin Compose v2
- Portainer CE acessível (porta 9000/9443)
- Um domínio apontando para o host (para TLS)
- Git (se for usar deploy via repositório)

---

## 2. Variáveis de ambiente

Use `.env.example` como base. Valores obrigatórios:

| Variável | Obrigatório | Descrição |
|---|---|---|
| `JWT_SECRET` | **Sim** | Mínimo 32 caracteres. Gere com: `openssl rand -hex 32` |
| `FISCAL_TOKEN` | **Sim** | Token compartilhado Node ↔ sidecar fiscal |
| `CORS_ORIGIN` | **Sim** (produção) | Origem pública, ex.: `https://seu-dominio.com` |
| `APP_URL` | Recomendado | `https://seu-dominio.com` |
| `BACKUP_INTERVAL_HOURS` | Não | Padrão `24` (0 desliga backups automáticos) |
| `BACKUP_KEEP` | Não | Padrão `14` backups mantidos |

> `.env.production` (raiz) é somente para **build do frontend** (`VITE_*`, embutido no bundle).
> Nunca coloque segredos lá — `JWT_SECRET`/`FISCAL_TOKEN` vão no `.env` do Compose ou nas
> Environment Variables da stack no Portainer.

---

## 3. Deploy no Portainer

1. **Stacks → Add stack**
2. Nome: `woobar`
3. Fonte:
   - **Git**: aponte para o repositório, `docker-compose.yml` como path de arquivo de compose; ou
   - **Web editor / Upload**: cole/envie o `docker-compose.yml`
4. Na seção **Environment variables**, defina `JWT_SECRET` e `FISCAL_TOKEN` (e `CORS_ORIGIN`/`APP_URL`)
5. **Deploy the stack**

O build acontece no host (multi-stage no `Dockerfile`). Aguarde o healthcheck do serviço
`woobar` ficar **healthy**:

```bash
docker ps --format '{{.Names}} {{.Status}}'
curl -fsS http://localhost:3001/api/health
```

---

## 4. Seed inicial (primeira execução)

O schema/migrations rodam sozinhos no startup. Os **dados iniciais** (estabelecimento,
cardápio, usuários) precisam ser semeados uma única vez:

```bash
docker exec woobar node dist/db/seed.js
```

O seed é idempotente (pula se o `slug=woobar` já existir).

Credenciais iniciais (troque imediatamente no primeiro login):

| E-mail | Senha | Papel |
|---|---|---|
| `admin@woobar.com` | `admin123` | admin |
| `ana@woobar.com` | `123456` | attendant |
| `carlos@woobar.com` | `123456` | kitchen |
| `marcos@woobar.com` | `123456` | courier |
| `julia@woobar.com` | `123456` | courier |

---

## 5. TLS / Reverse proxy

A API roda em `:3001` com HTTP. Em produção, coloque um reverse proxy com TLS na frente.

### Opção A — Caddy (recomendado por simplicidade)

`Caddyfile`:

```
seu-dominio.com {
    reverse_proxy woobar:3001
}
```

`docker-compose.caddy.yml` (adicionado à stack ou stack separada):

```yaml
services:
  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
    networks:
      - woobar_net

volumes:
  caddy_data:
```

Com o proxy na frente, defina na stack woobar:

```
CORS_ORIGIN=https://seu-dominio.com
APP_URL=https://seu-dominio.com
```

### Opção B — Nginx/Traefik/Cloudflare Tunnel

Mesmo princípio: proxy pass-through para `woobar:3001`, TLS terminado no proxy.
Para **WebSocket** (`/ws`) é necessário habilitar upgrade de headers:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
proxy_read_timeout 3600s;
```

---

## 6. Backups (SQLite)

- Automático: o servidor agenda `scheduleBackups()` a cada `BACKUP_INTERVAL_HOURS`
  (padrão 24h), mantendo `BACKUP_KEEP` (padrão 14) arquivos em `/app/data/backups/`
  dentro do volume `woobar_data`.
- Manual:

```bash
docker exec woobar node dist/db/backup.js
```

- Restaurar: pare o serviço, substitua `/app/data/woobar.db` pelo backup escolhido
  (o volume fica em `docker volume inspect woobar_woobar_data`).

---

## 7. Atualização

1. (Git) `git pull` no host ou suba novo `docker-compose.yml` no Portainer
2. **Update the stack** → o Compose rebuilda as imagens
3. Verifique `/api/health` e os logs: `docker logs -f woobar`

---

## 8. Verificação pós-deploy

```bash
curl -fsS http://localhost:3001/api/health      # 200 + { status, db: 'ok' }
docker ps                                        # woobar e woobar-fiscal healthy
docker logs woobar --tail 50                     # sem erros
```

Checklist:

- [ ] Login funciona em `https://seu-dominio.com`
- [ ] `VITE_API_URL=/api` embutido no bundle (Network → login → `/api/auth/login` no mesmo host)
- [ ] WebSocket conecta (`/ws` via proxy)
- [ ] Backup automático gerado após o intervalo
- [ ] Senhas do seed trocadas
- [ ] `.env` com segredos fora do Git

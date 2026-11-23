# Guia de Deploy - WOOBAR

## Pré-requisitos

1. **Docker** instalado e rodando
2. **Docker Swarm** inicializado (ou usar `docker stack deploy`)
3. **Traefik** configurado para roteamento
4. **Domínio** `woobar.wootech.com.br` configurado

## Configuração do Docker Swarm

### 1. Inicializar Docker Swarm (se ainda não foi feito)

```bash
docker swarm init
```

### 2. Criar rede de swarm (se não existir)

```bash
docker network create --driver overlay woo-network
```

### 3. Deploy da Stack WOOBAR

```bash
cd /opt/data/woobar
docker stack deploy -c docker-compose.woobar.yml woobar
```

### 4. Verificar Status

```bash
# Listar stacks
docker stack ls

# Listar serviços
docker service ls

# Verificar containers
docker ps -a

# Verificar logs
docker service logs woobar_woobar-frontend
docker service log woobar_woobar-api
```

## Configuração do Traefik

### Roteamento de Domínios

- **Frontend:** `woobar.wootech.com.br` → woobar-frontend (porta 80)
- **API:** `api.woobar.wootech.com.br` → woobar-api (porta 3000)

### Labels de Traefik (configurados no docker-compose)

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=woo-network"
  - "traefik.http.routers.woobar-frontend.rule=Host(`woobar.wootech.com.br`)"
  - "traefik.http.routers.woobar-frontend.entrypoints=websecure"
  - "traefik.http.routers.woobar-frontend.tls.certresolver=letsencrypt"
```

## Configuração do Supabase

### Variáveis de Ambiente

```bash
# Supabase URL
SUPABASE_URL=https://wcuknwkjrsnxjbpbktau.supabase.co

# Anon Key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (para operações administrativas)
SUPABASE_SERVICE_KEY=22i-Ybm4MpGpicXjZugHJ8uKfJXcPA5Kpim/88ahppLDsCrqtVBIYToz9uNjgVkstiEScOMBigXJDMLKxjAqUuaquZnj3w==

# JWT Secret
JWT_SECRET=cMOmx4xJZugHJ8uKfJXcPA5Kpim/88ahppLDsCrqtVBIYToz9uNjgVkstiEScOMBigXJDMLKxjAqUuaquZnj3w==

# Database URL
DATABASE_URL=postgresql://postgres.wcuknwkjrsnxjbpbktau:lMQFADbsT9wY2vjb0@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

## Testes Pós-Deploy

### 1. Testar Frontend

```bash
curl -I https://woobar.wootech.com.br
```

### 2. Testar API

```bash
curl -I https://api.woobar.wootech.com.br/health
```

### 3. Testar Autenticação

```bash
curl -X POST https://api.woobar.wootech.com.br/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@woobar.com", "password": "newpass123"}'
```

## Solução de Problemas

### Erro: "Cannot connect to the Docker daemon"

```bash
# Verificar se o Docker está rodando
sudo systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Verificar socket
ls -la /var/run/docker.sock
```

### Erro: "network woo-network not found"

```bash
# Criar a rede
docker network create --driver overlay woo-network

# Verificar redes
docker network ls
```

### Erro: "Invalid API key" (Supabase)

Verifique se as variáveis de ambiente estão corretas:
- `SUPABASE_URL` deve ser `https://wcuknwkjrsnxjbpbktau.supabase.co`
- `SUPABASE_ANON_KEY` deve ser a key do projeto wcuknwkjrsnxjbpbktau

### Erro de Autenticação

1. Verifique se o usuário está confirmado no Supabase
2. Teste com `newuser@woobar.com` / `newpass123`
3. Verifique se o email confirmation está desabilitado para o usuário específico

## Monitoramento

### Logs dos Serviços

```bash
# Logs do frontend
docker service logs woobar_woobar-frontend -f

# Logs da API
docker service log woobar_woobar-api -f
```

### Status dos Serviços

```bash
# Status geral
docker service ls

# Status de um serviço específico
docker service inspect woobar_woobar-frontend
```

## Rollback

```bash
# Remover a stack
docker stack rm woobar

# Re-deploy com versão anterior
docker stack deploy -c docker-compose.woobar.yml woobar
```
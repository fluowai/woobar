# Status de execução do plano de produção

Data: 2026-10-28

## Verificações executadas

- `npm.cmd run lint`: OK.
- `npm.cmd run build:all`: OK.
- `npm.cmd test --prefix server`: OK — 8 arquivos e 67 testes aprovados.
- `git diff --check`: há avisos de CRLF/trailing whitespace no `DEV/WORKLOG.md` preexistente; não foi reformatado para preservar alterações do checkout.
- Docker não está instalado neste ambiente; `docker compose config -q` não pôde ser executado.

## Ajustes aplicados nesta execução

- Adicionada validação para impedir `APP_URL` e `CORS_ORIGIN` com `localhost` ou `127.0.0.1` em produção.
- Configurados chunks manuais do Vite para React, mapas e Motion. O chunk inicial caiu de aproximadamente 648 KB para 480 KB.

## Ainda depende de validação externa

- Homologação NFC-e/SEFAZ com certificado A1, CSC e dados fiscais reais.
- Credenciais e homologação de iFood, Rappi, 99Food, Uber Eats e WhatsApp.
- Testes com impressora ESC/POS e agente local.
- Configuração de domínio, HTTPS, proxy reverso e WebSocket.
- Backup externo, monitoramento e alertas.
- Decisão de migração de SQLite para PostgreSQL para operação multiunidade.

## Estado

O código local está compilando e testado. Isso não substitui homologação fiscal, credenciais de marketplaces, teste de hardware ou teste de carga.

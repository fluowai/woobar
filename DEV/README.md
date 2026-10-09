# Woobar — Documentação

Sistema de gestão para bares/restaurantes (POS, delivery, KDS, canais).

## Índice

- `DEV/HANDOFF.md` — contexto atual e próximos passos
- `DEV/WORKLOG.md` — histórico de mudanças
- `DEV/VERIFY.md` — comandos de verificação e resultados
- `DEV/SPECS/ACTIVE.md` — contrato da tarefa ativa
- `DEV/SQL/` — scripts SQL
- `DEV/LOGS/` — logs de execução

## Stack

- Frontend: React 19 + Vite + Tailwind 4 (`src/`)
- Backend: Express + better-sqlite3 + TypeScript (`server/`)
- Comandos: `npm run dev:all` (web + api), `npm run lint` (tsc web), `npm run build:all`

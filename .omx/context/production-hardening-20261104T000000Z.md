# Context Snapshot

## Task statement

Execute the complete production-readiness plan for Woobar and continue until the implementation is complete and verified.

## Desired outcome

Harden the application for a controlled production pilot and improve the bar/restaurant operations platform, especially fichas, payments, security, integrations, observability, backups and verification.

## Known facts/evidence

- React/Vite frontend; Express/TypeScript backend; better-sqlite3; fiscal PHP sidecar; print agent.
- Existing modules include POS, tables, KDS, delivery, channels, events, bar tokens, inventory, CRM, marketing, payments and NFC-e.
- Backend TypeScript build previously passed; frontend build and Vitest were slow/hung in the prior audit environment.
- Working tree has substantial user changes; preserve them.
- Prior audit identified public payment simulation, possible token-validation race, plaintext fiscal secrets, WebSocket token in query string, permissive production Compose defaults and dependency vulnerabilities.

## Constraints

- Do not commit or push automatically.
- Preserve existing user changes.
- Use UTF-8-safe output and verify spelling.
- Do not claim production readiness without fresh verification evidence.
- External marketplace credentials/homologation cannot be completed locally; implement safe integration contracts and document those external blockers.

## Open questions

- Whether the deployment target will remain SQLite or move to PostgreSQL.
- Which payment provider and marketplace credentials will be used in production.
- Whether offline validation is required for the first pilot.

## Likely touchpoints

- server/src/routes/tokens.ts
- server/src/routes/payments.ts
- server/src/services/payments/service.ts
- server/src/services/fiscal.ts
- server/src/index.ts
- docker-compose.yml and server/src/lib/env.ts
- dependency manifests/lockfiles
- tests and DEV production documentation

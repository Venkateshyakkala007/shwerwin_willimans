# Cover the Codebase

Phase 1 individual developer dashboard based on the supplied Sherwin-Williams scoreboard reference. The project uses deterministic fake data and contract-compliant fake connectors until enterprise APIs are available.

## Start locally

```bash
cp env.example .env
npm install
npm run dev
```

Open `http://localhost:3000`.

## Useful scripts

```bash
npm run build
npm run lint
npm run typecheck
npm test
npm run seed -- happy-path
npm run sync:nightly
npm run verify
```

## Structure

- `app/` — pages and REST route handlers.
- `apps/worker/` — background synchronization entry point.
- `components/ui/` — reusable shadcn interface primitives.
- `packages/contracts/` — canonical domain and provider contracts.
- `packages/connectors/` — fake connectors and production safety checks.
- `packages/test-data/` — deterministic scenarios.
- `scripts/` — seed, sync, and verification utilities.
- `tests/` — contract and safety tests.
- `docs/` — architecture and API notes.

All visible records are synthetic and illustrative. Fake adapters must never be enabled in production.

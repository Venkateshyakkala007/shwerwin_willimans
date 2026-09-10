# PostgreSQL setup and data flow

## Source of truth

PostgreSQL is now the operational source of truth for the dashboard. Synthetic development records are stored in `database/seed.sql`, not in a TypeScript scenario file.

```text
database/seed.sql
       |
       v
PostgreSQL 16
       |
       v
Node API on port 4000
       |
       v
Web route proxy on port 3000
       |
       v
React dashboard
```

The web process does not connect directly to PostgreSQL. This keeps database credentials out of the browser and supports edge/web runtimes that cannot open raw PostgreSQL connections.

## Files

| File | Purpose |
|---|---|
| `database/schema.ts` | Typed Drizzle schema, constraints, indexes, and relationships. |
| `database/migrations/0000_initial.sql` | Creates the 19 approved PostgreSQL tables. |
| `database/seed.sql` | Inserts the deterministic synthetic user, catalog, progress, activity, badges, points, and operations data. |
| `scripts/run-sql.mjs` | Applies a SQL file using `DATABASE_URL`; blocks the synthetic seed when `NODE_ENV=production`. |
| `apps/api/src/db.ts` | Creates the PostgreSQL connection pool. |
| `apps/api/src/repository.ts` | Loads dashboard projections and commits progress transactions. |
| `apps/api/src/server.ts` | Exposes the versioned HTTP API. |
| `lib/backend.ts` | Proxies web routes to the API without exposing database credentials. |

## Docker startup

```bash
npm run docker:up
```

The `postgres_data` named volume preserves records across ordinary restarts. On every startup, the API service applies pending Drizzle migrations and then runs the idempotent seed before listening for requests. This keeps Drizzle's migration journal correct and makes new migrations safe to add.

To apply files manually to an existing database:

```bash
export DATABASE_URL=postgresql://cover_app:cover_dev@localhost:5432/cover_codebase
npm run db:migrate
npm run db:seed
```

The seed uses stable UUIDs and `ON CONFLICT (id) DO NOTHING`, so rerunning it does not duplicate the same development rows.

## Progress transaction

`PUT /api/v1/progress` performs these actions in one PostgreSQL transaction:

1. Serializes simultaneous retries of the same operation ID with a transaction-scoped PostgreSQL advisory lock.
2. Checks `idempotency_records` for the client operation ID.
3. Locks the course and current progress row.
4. Validates that manual progress is permitted.
5. Compares `expectedVersion` with the stored version.
6. Updates or creates `course_progress`.
7. Appends an `audit_events` record.
8. Appends an `outbox_events` record for later integration.
9. Stores the response in `idempotency_records` and commits.

If any step fails, the transaction rolls back. Repeating the same operation ID and body returns the stored result; reusing it for a different body returns a conflict.

## Production boundary

The local credentials and seed are development-only. Production needs a managed PostgreSQL instance, TLS, secrets management, least-privilege roles, backups, migration automation, and real authentication. A hosted frontend must receive a reachable `BACKEND_API_URL`; it cannot access a developer laptop database.

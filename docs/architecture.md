# Cover the Codebase — Technical Architecture

## 1. Purpose

This document explains the architecture of the current Cover the Codebase Phase 1 codebase, the technologies used, why they were selected, how the containers work, and how the demonstration framework can evolve into the planned production system.

The current application is a functional demonstration backed by deterministic synthetic records in PostgreSQL because Microsoft Entra ID, HR, learning-provider, Databricks, and engineering-provider APIs are not yet available.

The architecture deliberately keeps SQL seed data, future provider adapters, application contracts, worker behavior, and user-interface code separate. Real integrations can therefore replace the seeded inputs without redesigning the dashboard or its business contracts.

## 2. Architecture summary

The Phase 1 system is a Docker-managed modular monolith with three application processes:

```text
Developer browser
        |
        | HTTPS / REST
        v
Web application (Vinext / React)
        |
        | internal HTTP
        v
Node API
        |
        +------------------ PostgreSQL
        |                   Durable operational records
        |
        +------------------ Redis
        |                   Queues, locks, retries and rate limits
        |
        +------------------ Worker process
                               |
                               +-- Provider connectors
                               +-- Databricks Bronze export
                               +-- Databricks Gold import
```

The complete implementation runs locally through Docker Compose. The web runtime proxies API requests to the Node API; only the API and worker receive database credentials. A hosted frontend requires a separately reachable API and managed PostgreSQL service because the edge web runtime cannot open a connection to a developer-laptop database.

## 3. Architectural style

### Modular monolith

The project uses a modular-monolith approach. It is one application product, but its responsibilities are separated into modules and packages.

This was selected because:

- Phase 1 has a 12-week delivery window.
- The source plan assumes two developers.
- Transactions across progress, audit, recognition, and outbox records are easier to keep correct in one operational boundary.
- A microservice architecture would add network calls, distributed transactions, additional deployments, and more monitoring requirements.
- Domain boundaries can still be extracted later if operational evidence justifies it.

Microservices and Kubernetes are intentionally not required for Phase 1.

### Contract-first integration

The application defines canonical TypeScript contracts before implementing production providers. Provider-specific payloads must be translated by connectors.

```text
Provider payload
      |
      v
Provider adapter
      |
      v
Canonical contract
      |
      +-- Domain services
      +-- REST APIs
      +-- Dashboard UI
      +-- Tests
```

This prevents fields from GitHub, Pluralsight, Databricks, or another vendor from leaking directly into UI components and business rules.

## 4. Technology stack and rationale

| Area | Technology | Why it is used |
|---|---|---|
| Language | TypeScript | Shared types across the UI, API contracts, database repository, and worker code reduce integration mistakes. |
| UI framework | React 19 | Component composition, accessible interactions, and state-driven dashboard behavior. |
| Web framework | Vinext with Next-compatible application APIs | Provides file-based pages and route handlers while producing Cloudflare Worker-compatible output for Sites hosting. |
| Styling | Tailwind toolchain plus project CSS tokens | Tailwind and shadcn are available for reusable primitives; custom CSS closely reproduces the supplied scoreboard reference. |
| UI primitives | shadcn components | Accessible, reusable controls are available without committing the product to a rigid visual theme. |
| Icons | Lucide React | Consistent accessible interface icons with small bundle overhead. |
| Validation boundary | TypeScript contracts and explicit request validation | Commands are validated at the API boundary; production provider payloads should additionally use versioned runtime schemas. |
| Operational database | PostgreSQL 16 in the container topology | Strong transactions, relational constraints, migrations, JSON support for bounded metadata, and mature backup tooling. |
| Queue and coordination | Redis 7 in the container topology | Suitable for jobs, short-lived locks, retries, rate limits, and temporary caching. It is not used as the business source of truth. |
| Database access | `pg` pool plus Drizzle ORM schema tooling | `pg` handles parameterized queries and transactions; Drizzle defines the schema and generates migrations. |
| Integration and analytics | Databricks, pending access | Intended enterprise Bronze/Silver/Gold consolidation layer. PostgreSQL outbox records preserve actions until the connector is available. |
| Packaging | Docker and Docker Compose | Reproducible application, worker, PostgreSQL, and Redis environments. |
| Frontend hosting | OpenAI Sites / Cloudflare-compatible worker output | Can host the web artifact after `BACKEND_API_URL` points to a reachable API; it does not host PostgreSQL. |
| Testing | Node test runner, TypeScript compiler, Oxlint | Schema/seed contract tests, static type checks, and code-quality validation. |
| Build toolchain | Vite through Vinext | Fast development updates and optimized client/server builds. |

## 5. Repository structure

```text
app/
|-- app/
|   |-- page.tsx                 # Interactive individual dashboard
|   |-- layout.tsx               # Metadata and HTML layout
|   |-- globals.css              # Brand tokens and primary styles
|   |-- extended.css             # Learning and benchmark styles
|   `-- api/v1/                  # Thin HTTP proxies to the Node API
|-- apps/
|   |-- api/src/                 # PostgreSQL repository and HTTP server
|   `-- worker/src/              # Background reconciliation entry point
|-- database/
|   |-- schema.ts                # Drizzle schema for the approved tables
|   |-- migrations/              # Executable PostgreSQL migrations
|   `-- seed.sql                 # Deterministic synthetic development rows
|-- components/
|   `-- ui/                      # shadcn interface primitives
|-- packages/
|   |-- contracts/src/           # Canonical domain and integration types
|   `-- connectors/src/          # Future connector configuration boundary
|-- scripts/
|   |-- run-sql.mjs              # Guarded SQL seed runner
|   `-- verify.mjs               # Environment safety validation
|-- tests/                       # Contract and production-safety tests
|-- docs/                        # Architecture and API documentation
|-- Dockerfile                   # Application container build
|-- docker-compose.yml           # Local multi-container topology
|-- env.example                  # Configuration contract
|-- package.json                 # Dependencies and developer scripts
|-- vite.config.ts               # Vinext/Sites build integration
`-- .openai/hosting.json         # Hosted demonstration configuration
```

## 6. Module responsibilities

### Web application

The web application:

- Renders the personal developer dashboard.
- Displays learning, activity, recognition, certifications, AI-tool mix, and data freshness.
- Provides a privacy-safe team benchmark.
- Proxies short REST commands and queries to the Node API.
- Will enforce authentication and authorization when Entra configuration becomes available.
- Must not perform long provider or Databricks synchronization inside a user request.

The current main user interface is implemented in `app/page.tsx`. Production growth should split this surface into product-specific components while preserving the same contracts.

### REST APIs

The current API routes are:

| Endpoint | Responsibility |
|---|---|
| `GET /api/v1/me` | Return the normalized signed-in user projection. |
| `GET /api/v1/me/dashboard` | Return the personal dashboard snapshot. |
| `GET /api/v1/courses` | Return courses eligible for the current employment type. |
| `PUT /api/v1/progress` | Commit idempotent, versioned manual progress in PostgreSQL. |
| `GET /api/v1/health/live` | Confirm that the API process is running. |
| `GET /api/v1/health/ready` | Confirm that the API can query PostgreSQL. |

APIs use a `/v1` namespace so future breaking changes can be introduced deliberately.

### Contracts package

`packages/contracts/src/index.ts` defines normalized types for:

- User profiles and external identities.
- Employment and eligibility.
- Courses and progress.
- Tool usage.
- Dashboard snapshots.
- API errors.

Domain consumers depend on these contracts rather than a provider response.

### Database and seed

`database/schema.ts` defines the approved 19-table relational model. Drizzle generates the SQL migration, while runtime repositories use parameterized `pg` queries and explicit transactions.

`database/seed.sql` contains all deterministic synthetic development records. It uses stable identifiers, a fictional `.invalid` email address, and idempotent inserts. The former TypeScript scenario module has been removed, preventing the UI, APIs, and worker from developing separate versions of the same data.

### Connectors package

`packages/connectors/src/index.ts` now holds only the future connector configuration boundary. No in-memory records or fake provider responses are stored there. Entra, HR, learning, and Databricks adapters can be added behind the canonical contracts when access is supplied.

### Worker

The worker is a separate runtime responsibility even though it shares the same repository and contracts.

Its intended responsibilities are:

- Process Redis queue jobs.
- Run scheduled synchronization.
- Export PostgreSQL outbox events to Databricks Bronze.
- Import validated Gold manifests.
- Reconcile counts and checksums.
- Advance checkpoints only after reconciliation.
- Evaluate badges asynchronously.
- Retry temporary failures with bounded backoff.

The current worker reads PostgreSQL counts and records an idempotent reconciliation run in `integration_runs`. Provider import/export and Redis queue consumption remain pending until external APIs are available.

## 7. Container architecture

Docker Compose defines five services:

```text
+------------------+       +------------------+
| web              +------>| API              |
| port 3000        | HTTP  | port 4000        |
+------------------+       +--------+---------+
                                  |
                         +--------+---------+
                         | PostgreSQL 16    |
                         | durable volume   |
                         +--------+---------+
                                  ^
                                  |
                         +--------+---------+       +------------------+
                         | worker           +------>| Redis 7          |
                         | reconciliation   |       | transient state  |
                         +------------------+       +------------------+
```

### Web container

The web service:

- Runs the Vinext development server locally.
- Exposes port `3000`.
- Receives only `BACKEND_API_URL`, not database credentials.
- Proxies `/api/v1` requests to the API container.
- Mounts the source tree for local development updates.

In production, the web container should use the immutable output created by the Docker build rather than a source mount.

### API container

The API service:

- Runs the Node HTTP server on port `4000`.
- Owns the PostgreSQL connection pool and parameterized queries.
- Builds the dashboard projection from normalized tables.
- Commits progress, idempotency, audit, and outbox records transactionally.
- Exposes liveness and PostgreSQL readiness endpoints.

### Worker container

The worker service:

- Uses the same source, contracts, and connector packages as the web process.
- Runs separately so long operations do not block browser requests.
- Uses its own database connection identity in the proposed production model.
- Currently executes a PostgreSQL-backed reconciliation run.

The production command should start the durable queue consumer rather than exit after one simulated synchronization.

### PostgreSQL container

PostgreSQL provides durable operational state for the current application.

It stores:

- Users and immutable provider mappings.
- Profile and eligibility projections.
- Learning assignments and progress.
- Knowledge-check attempts.
- Point-ledger and badge entries.
- Certifications and personal awards.
- Audit events.
- Idempotency records.
- Outbox events.
- Synchronization runs and checkpoints.
- Weekly dashboard activity projections.

The Compose file uses a named volume, `postgres_data`, so ordinary container restarts do not delete database records.

Production must not use the demonstration password from Docker Compose. Credentials must be supplied through the approved secrets platform.

### Redis container

Redis is used for transient coordination:

- Job queues.
- Distributed locks.
- Retry scheduling.
- Rate limits.
- Short-lived cache.

Redis must not be treated as the authoritative database. Required business evidence must remain in PostgreSQL so queues can be reconstructed after Redis loss.

### Dockerfile stages

The Dockerfile uses a multi-stage build:

1. `base` installs pinned dependencies with `npm ci`.
2. `development` copies source and supports the web, API, and worker Compose services.
3. `build` creates the optimized web application output.
4. `api-runtime` and `worker-runtime` define the separate production process commands.
5. `runtime` copies only the web output and required runtime dependencies.

Benefits include:

- Repeatable dependency installation from `package-lock.json`.
- Separation of build tooling from the runtime stage.
- An immutable artifact that can be promoted across environments.
- Reduced differences between development, UAT, and production.

## 8. Current data flows

### Dashboard query

```text
Browser
  -> React dashboard
  -> GET /api/v1/me/dashboard
  -> web route proxy
  -> Node API repository
  -> parameterized PostgreSQL queries
  -> canonical DashboardSnapshot response
```

The React page contains presentation logic but no synthetic business records. Metrics such as trained percentage, active weeks, points, and badge counts are calculated from the database result.

### Course eligibility

```text
GET /api/v1/courses
  -> PostgreSQL user and team record
  -> active path assignments
  -> employment-type eligibility
  -> filtered course list
```

Employment type is an explicit HR-derived attribute. It must never be inferred from an email address.

### Manual progress

```text
Client
  -> PUT /api/v1/progress
       x-client-operation-id
       expectedVersion
  -> input validation
  -> PostgreSQL transaction
       -> persisted idempotency check
       -> locked progress version check
       -> progress update
       -> audit event
       -> outbox event
  -> commit and return progress result
```

The entire command either commits or rolls back. Replays survive API restarts because the response is stored in `idempotency_records`.

### Current nightly reconciliation

```text
Worker
  -> query PostgreSQL source counts
  -> count pending outbox events
  -> upsert one logical integration run per date
  -> report reconciliation result
```

The external Databricks export/import steps remain behind the connector boundary until credentials and contracts are supplied.

## 9. Intended production data flow

```text
1. Developer submits a progress change.
2. Web application validates identity, authorization, input and record version.
3. PostgreSQL transaction stores progress, audit and outbox evidence.
4. The web request completes without waiting for Databricks.
5. Worker reads an outbox batch.
6. Worker exports the batch to Databricks Bronze.
7. Databricks normalizes records in Silver.
8. Databricks publishes an approved Gold manifest.
9. Worker stages and validates Gold records.
10. Accepted records are applied transactionally.
11. Counts and checksums are reconciled.
12. Checkpoint advances only after reconciliation succeeds.
13. Dashboard snapshot is refreshed.
```

If Databricks is unavailable, the application retains user actions and outbox evidence in PostgreSQL, shows stale data status where appropriate, and retries later.

## 10. PostgreSQL and Databricks boundary

### PostgreSQL owns

- Live application state.
- User actions.
- Manual progress.
- Point and badge evidence.
- Audit and idempotency.
- Outbox events.
- Sync checkpoints and run status.
- Dashboard projections.

### Databricks owns

- Enterprise source ingestion.
- Raw provider preservation in Bronze.
- Identifier and type normalization in Silver.
- Approved analytical facts and aggregates in Gold.
- Enterprise-scale data-quality processing.

The application must not query arbitrary Bronze provider data during a browser request.

## 11. Authentication and authorization

### Current demonstration

The current demonstration uses a fixed synthetic user. It does not claim to provide production authentication.

### Production design

Microsoft Entra ID will authenticate users using OpenID Connect authorization-code flow.

The adapter must validate:

- Tenant.
- Issuer.
- Audience.
- Cryptographic signature.
- State and nonce.
- Token lifetime.
- Required group, app role, or entitlement.
- Immutable Entra object ID.

Email is display data, not the permanent identity key.

Authorization remains an application responsibility after authentication. The application must check active HR status, entitlement, employment type, route permission, and data ownership.

## 12. Security and privacy architecture

Required controls include:

- No raw AI prompts.
- No unnecessary source-code bodies.
- No individual engineering-effectiveness score.
- No named coworker comparison in Phase 1.
- Configurable small-cohort benchmark suppression.
- Immutable external identity mapping.
- Idempotency for replayable mutations.
- Optimistic concurrency for existing-record updates.
- Append-oriented point, badge, and audit evidence.
- Least-privilege web, worker, migration, and read-only database roles.
- Secret storage outside images and source control.
- Structured logs with sensitive-field redaction.
- TLS for external connections.
- Rate limits and replay controls.
- Local demo authentication and synthetic seed execution prohibited in production.

The current one-person team benchmark is suppressed because it is below the configured minimum cohort size.

## 13. Reliability controls

The production implementation should include:

- Bounded record and byte-size batches.
- Connector-specific timeouts.
- Bounded retry with backoff.
- Redis distributed locks.
- PostgreSQL uniqueness for logical scheduled runs.
- Idempotent outbound and inbound processing.
- Stable cursor or manifest checkpoints.
- Staging before business-table application.
- Quarantine for invalid or ambiguous records.
- Count and checksum reconciliation.
- Late-arrival and correction support.
- Visible current, stale, partial, and unavailable states.
- Backup, restore, migration, and rollback rehearsals.

## 14. Configuration

`env.example` documents the expected runtime configuration:

| Variable | Purpose |
|---|---|
| `NODE_ENV` | Select development or production behavior. |
| `AUTH_ADAPTER` | Select local or Entra identity adapter. |
| `API_PORT` | Node API listen port. |
| `API_ALLOWED_ORIGIN` | Browser origin permitted by API CORS. |
| `BACKEND_API_URL` | Internal URL used by web route proxies. |
| `DEFAULT_USER_ID` | Synthetic development identity until Entra is configured. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `DATABASE_POOL_SIZE` | Maximum API PostgreSQL pool size. |
| `REDIS_URL` | Redis connection string. |
| `ENTRA_TENANT_ID` | Entra tenant configuration. |
| `ENTRA_CLIENT_ID` | Entra application identity. |
| `ENTRA_CLIENT_SECRET` | Entra confidential secret; production secrets platform only. |

Protected production API requests fail closed until the Entra adapter is implemented. The SQL seed runner also refuses to execute when `NODE_ENV=production`.

## 15. Developer and operational scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the development web server. |
| `npm run api:dev` | Start the PostgreSQL API with file watching. |
| `npm run api:start` | Start the PostgreSQL API once. |
| `npm run build` | Produce the deployable client/server application output. |
| `npm run typecheck` | Validate TypeScript contracts and implementation. |
| `npm run lint` | Check application, package, script, and test source. |
| `npm test` | Run contract and production-safety tests. |
| `npm run verify` | Run the complete local quality gate. |
| `npm run db:generate` | Generate SQL migrations from the Drizzle schema. |
| `npm run db:migrate` | Apply pending PostgreSQL migrations. |
| `npm run db:seed` | Insert deterministic synthetic records from SQL. |
| `npm run sync:nightly` | Run the PostgreSQL reconciliation worker. |
| `npm run docker:up` | Build and start the local multi-container topology. |
| `npm run docker:down` | Stop the local topology without intentionally deleting its volume. |

## 16. Deployment architecture

### Frontend hosting boundary

```text
Source repository
  -> Vinext build
  -> Cloudflare Worker-compatible application artifact
  -> private OpenAI Sites deployment
```

The web artifact can be hosted in this environment, but the PostgreSQL-backed version also requires a reachable API service. A local Docker hostname or laptop database cannot be used by the hosted worker. This does not replace the pending Azure production architecture or enterprise provider validation.

### Recommended Azure production mapping

| Need | Recommended Azure service |
|---|---|
| Web, API, and worker containers | Azure Container Apps |
| Container registry | Azure Container Registry |
| PostgreSQL | Azure Database for PostgreSQL Flexible Server |
| Redis | Azure Managed Redis or approved equivalent |
| Secrets | Azure Key Vault with managed identities |
| Logs and telemetry | Application Insights and Azure Monitor |
| Ingress and TLS | Container Apps ingress or approved enterprise ingress |
| CI/CD | Azure DevOps Pipelines or GitHub Actions |
| Databricks | Approved Azure Databricks workspace and catalogs |

These services remain recommendations until the client confirms subscription, networking, private endpoints, ingress, identity, backup, RPO, RTO, and operational ownership.

## 17. CI/CD design

```text
Pull request
  -> install locked dependencies
  -> typecheck and lint
  -> unit and contract tests
  -> migration and integration tests
  -> security and dependency scans
  -> build immutable image
  -> container vulnerability scan
  -> deploy development
  -> run migrations and smoke tests
  -> approval-based promotion to UAT
  -> promote the same image to production
  -> verify health, sync and user journey
```

The same immutable image should be promoted across environments. Environment differences must come from configuration and secrets, not rebuilt source.

## 18. Current limitations

The current codebase is a PostgreSQL-backed development implementation using synthetic SQL records. It does not yet include:

- Real Entra OIDC authentication.
- A live Redis queue consumer.
- Real Databricks Bronze/Gold endpoints.
- Real HR, Pluralsight, GitHub, Jira, ServiceNow, gateway, Copilot, or code-quality adapters.
- Approved point, badge, Sheen, cohort, retention, and deletion rules.
- Azure infrastructure definitions.
- Production secrets, private networking, monitoring, backup, RPO, and RTO configuration.

These are integration and client-decision dependencies rather than reasons to couple the dashboard to temporary provider payloads.

## 19. Recommended implementation sequence

1. Add runtime validation schemas for every provider contract.
2. Add Redis/BullMQ-compatible durable worker processing.
3. Add production Entra authentication and authorization.
4. Add HR profile and cross-provider identity synchronization.
5. Complete knowledge-check submission, point-ledger, and badge evaluation services.
6. Implement Bronze export and Gold import with staging and reconciliation.
7. Add contract-tested production provider adapters.
8. Add least-privilege database roles and managed secret injection.
9. Add security, accessibility, performance, resilience, backup, and recovery evidence.
10. Deploy the same tested containers to the confirmed Azure platform.

## 20. Architecture principles to preserve

- Keep Phase 1 focused on the individual developer experience.
- Keep provider payloads behind adapters.
- Keep PostgreSQL authoritative for application actions.
- Keep Redis transient and reconstructable.
- Consume approved Databricks Gold data, not arbitrary Bronze data, in the application.
- Use immutable identity keys and explicit mappings.
- Commit business action, audit, and outbox evidence transactionally.
- Make retries idempotent and updates version-aware.
- Keep metrics transparent, versioned, and privacy-preserving.
- Never store raw prompts or create an automated employee performance score.
- Prefer correctness, security, accessibility, reconciliation, and recovery over optional visual richness.

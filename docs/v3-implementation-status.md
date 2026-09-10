# V3 implementation status

Updated 9 September 2026. This document supersedes older runtime descriptions for the local demo. `Phase-1-v3.md` remains the target enterprise specification.

## Implemented for local testing

- Additive `v3` relational model: hierarchy, effective memberships, explicit scope/field grants, course versions and content entitlements, assignments, repeatable enrollments, attestations/retractions, append-only learning events, durable jobs and receipts, sample policies and 25 metric definitions, immutable publications/components/groups/consumption, programme fixtures and PostgreSQL rate limits.
- Current active/entitled/employment checks, public-only contractor filters across discovery, writes, assessment and evidence paths; current authorization before mutation replay. Demo identity only, production fails closed.
- Enrollment-linked progress; explicit completion/retraction with statement, claimed time and receipt time. Transactional audit/outbox/receipt/job intent. Optimistic concurrency uses HTTP 412; operation conflicts use 409. Duplicate concurrent requests are serialized and replayed.
- 25 metric cards, exact weights, five independent groups, diagnostic handling, missing-data blocking, evidence explanations, monthly consumption, manager scope/person views, assessments, preserved synthetic recognition and JSON exports.
- PostgreSQL worker claims, retry state, leases/fencing, 03:00 Eastern seasonal UTC scheduling, synthetic publication validation and atomic pointer activation. Invalid fixtures leave the preceding publication active. Published results and manifests are immutable.
- Local event sink receipts explicitly identify `synthetic_local_sink`; no event is claimed to have reached Databricks.
- Docker development web/API/worker/PostgreSQL services, persistent database volume, loopback ports, optional Redis and reduced Docker build context.

## Deliberate development boundaries

- The local runtime is one isolated demo workspace. It does not implement enterprise multi-tenancy, Entra OIDC, secure server sessions, workforce revocation feeds or a policy administration/approval workflow. Production requests and synthetic workers fail closed. Demo identity switching is intentional and must never be exposed as production authentication.
- Metric observations and normalized values are supplied synthetic fixtures. Sample normalizers/baselines, weights outside Quality, honour-evidence mapping and privacy threshold 5 are not organizational approvals. There is no implementation claim for the 25 source extraction/formula pipelines. No actual vendor tables, live CI/review/revert history, Unity Catalog grants or external transfer have been verified.
- Existing broad-provider weekly data and recognition remain legacy synthetic evidence. Do not reinterpret old `trained`/`adopted` fields as M25 scores. The legacy percentage-write API now returns 410.
- Initial V3 assignments create fresh attempts; prior synthetic completion may initialize progress at 99%, but cannot initialize an accepted completion attestation. Existing history is preserved. Link-verification flags are sample review fixtures, not live URL checks.
- The catalogue fits within a bounded 50-row query. Enterprise signed cursors, complete filtering/sorting/search contracts, privacy anti-inference across arbitrary overlapping scopes, separate per-metric restricted fields and audit of every privileged read require further work.
- A single hierarchy and seven synthetic champions are supplied. The production 50-person roster, repository list and full historical workforce attribution need owner-provided contracts. No real repositories are ingested.
- Consumption is a September 2026 fixture with known credits/allocation and unknown billed currency. A nightly view is not real-time spending enforcement.
- No full offline mutation replay is enabled. Mutations require a connected server and explicit acknowledgement. Assessment drafts are not persisted across sessions.
- Recognition is read from the preserved sample ledger. New badge/points policies are not invented. Full content administration, course-unit authoring, certification verification, award workflows and evidence-approved Enablement mappings remain enterprise implementation work.
- The worker publishes bounded local fixtures transactionally; no network transfer occurs inside its transactions. Real transport must be implemented outside database locks with frozen batch membership, manifests, acknowledgements, quarantine and reconciliation.
- SQL stores and transactions are tested locally; production least-privilege roles, row/tenant ownership expansion, audit retention/archival, managed secrets, backups/PITR, infrastructure, availability/load/accessibility acceptance and security review remain pending.
- Existing Vinext/React architecture is retained for local development. The V3 Next.js runtime decision and deployment compatibility require target-platform validation.

## Source authority

Legacy tables remain in their existing namespace and retain their keys. V3 additions are reviewed SQL under `v3`; new identifiers use UUIDv7 in runtime code, and explicit fixture identifiers are synthetic. Do not migrate identifiers destructively or overwrite evidence. Real warehouse identifiers must come from the data owner.

The scope of this change is a locally runnable development implementation for browser testing with fake data. It is not full V3 production acceptance.

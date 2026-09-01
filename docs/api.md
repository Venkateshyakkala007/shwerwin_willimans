# API summary

- `GET /api/v1/me` — current normalized profile.
- `GET /api/v1/me/dashboard` — personal snapshot, activity, tool mix, recognition, and freshness.
- `GET /api/v1/courses` — eligible canonical courses.
- `PUT /api/v1/progress` — idempotent, versioned manual progress simulation.
- `GET /api/v1/health/live` — process liveness.
- `GET /api/v1/health/ready` — fake connector readiness.

Progress updates require `x-client-operation-id` and an `expectedVersion` of `1` in this fake implementation. Reusing an operation ID returns the original result; a stale version returns `409 VERSION_CONFLICT`.

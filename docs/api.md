# API summary

The standalone Node API listens on port `4000`. Browser requests use the same paths on port `3000`; Vinext route handlers proxy them to the API through `BACKEND_API_URL`. Every business response is loaded from PostgreSQL.

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/me` | Current normalized user, team, entitlement, and external identity mappings. |
| `GET /api/v1/me/dashboard` | Complete personal dashboard projection: metrics, activity, tools, badges, paths, courses, certifications, knowledge check, freshness, and benchmark privacy state. |
| `GET /api/v1/courses` | Active courses assigned and eligible for the current user's employment type. |
| `PUT /api/v1/progress` | Transactional, idempotent, versioned manual progress update. |
| `GET /api/v1/health/live` | API process liveness. |
| `GET /api/v1/health/ready` | PostgreSQL connectivity readiness. |

## Manual progress request

```http
PUT /api/v1/progress
Content-Type: application/json
X-Client-Operation-Id: 82b3d3bf-f568-42ec-8da7-7453713073b5

{
  "courseId": "d4000000-0000-4000-8000-000000000006",
  "percentage": 100,
  "expectedVersion": 4
}
```

The course must allow manual progress. `expectedVersion` must equal the current `course_progress.version`. The operation ID is persisted in PostgreSQL:

- Same operation ID and same body: returns the stored response with `meta.replayed: true`.
- Same operation ID and different body: `409 OPERATION_ID_REUSED`.
- Stale version: `409 VERSION_CONFLICT` with the current version.
- Provider-managed course: `403 MANUAL_PROGRESS_NOT_ALLOWED`.

## Development identity

Until Entra authentication is available, the API uses `DEFAULT_USER_ID`. Tests can select another seeded user with `x-demo-user-id`. All authenticated data endpoints reject production mode until the real Entra adapter is implemented.

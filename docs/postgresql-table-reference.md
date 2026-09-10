# Cover the Codebase — PostgreSQL Table and Column Reference

## 1. Purpose

This document explains every table and column in the approved minimal PostgreSQL ER design. It should be read together with `postgresql-er-schema.md`.

The examples are illustrative. Names, identifiers, scoring rules, eligibility rules, provider fields, and retention periods must be confirmed before production.

## 2. Common conventions

### Identifiers

Application records use UUID primary keys.

Example:

```text
7c986e20-43a2-4a86-817d-6effc840ca91
```

UUIDs avoid exposing sequential record counts and can be generated safely by distributed application processes.

### Timestamps

Use PostgreSQL `timestamptz` and store values in UTC.

Example:

```text
2026-09-02T08:30:00Z
```

The UI converts UTC timestamps to the developer's configured timezone.

### Status fields

Status fields should use PostgreSQL check constraints or controlled application enums. Do not allow arbitrary status text.

### JSONB

JSONB is used only for bounded, versioned structures such as evidence, assessment questions, rules, tool mix, or error summaries. Important searchable relationships remain relational columns.

### Historical records

Users, assignments, progress, recognition, ledger, audit, and integration evidence should normally be deactivated, superseded, reversed, or expired rather than physically deleted.

---

## 3. `teams`

### Why this table exists

`teams` stores the stable identity and name of each engineering team.

It helps the application:

- Display the current developer's team.
- Assign users to a consistent team identifier.
- Calculate anonymized team benchmarks.
- Handle a team rename without changing every user record.
- Deactivate a retired team while preserving historical references.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Internal primary key for the team. Other tables reference this value. | `a1000000-0000-4000-8000-000000000001` |
| `name` | `text` | Yes | Current display name of the team. | `Digital Commerce` |
| `active` | `boolean` | Yes | Indicates whether the team can receive current user assignments. | `true` |
| `created_at` | `timestamptz` | Yes | Time the team record was created. | `2026-08-24T09:00:00Z` |
| `updated_at` | `timestamptz` | Yes | Time the team record was last changed. | `2026-09-01T11:15:00Z` |

### Example row

```json
{
  "id": "a1000000-0000-4000-8000-000000000001",
  "name": "Digital Commerce",
  "active": true,
  "created_at": "2026-08-24T09:00:00Z",
  "updated_at": "2026-09-01T11:15:00Z"
}
```

### Important rules

- `name` should be unique among active teams if the business guarantees unique names.
- Retired teams should normally use `active = false` instead of being deleted.
- A Phase 1 API must not use this table to expose a named coworker roster.

---

## 4. `users`

### Why this table exists

`users` is the internal application account and current Phase 1 profile for a developer.

It helps the application:

- Give every person one stable internal UUID.
- Store the current HR-derived role and employment type.
- Decide whether the person is active and entitled.
- Select the correct learning path.
- Display profile information and timezone-aware dates.
- Attach progress, badges, points, certifications, and activity to the same internal person.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Internal application user ID and primary key. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `team_id` | `uuid` | Conditional | Foreign key to `teams.id`. It may be null while a profile is pending. | `a1000000-0000-4000-8000-000000000001` |
| `display_name` | `text` | Yes | User-facing name supplied by Entra or HR. | `Priya Kowalski` |
| `email` | `text` | Yes | Current email for display and communication. It is not the permanent identity key. | `priya.kowalski@example.invalid` |
| `person_number` | `text` | Conditional | Stable HR person or employee number. | `P-104827` |
| `employment_type` | `text` | Conditional | HR-authoritative classification used for eligibility. | `employee` |
| `job_role` | `text` | Conditional | Current HR-derived job role. | `Senior Software Engineer` |
| `timezone` | `text` | Yes | IANA timezone used for presentation and period boundaries. | `America/New_York` |
| `profile_status` | `text` | Yes | Indicates whether the profile is ready, incomplete, or inactive. | `active` |
| `active` | `boolean` | Yes | Current HR/application active state. | `true` |
| `entitled` | `boolean` | Yes | Whether the user has the required application entitlement. | `true` |
| `created_at` | `timestamptz` | Yes | Time the application user was first created. | `2026-09-02T07:45:00Z` |
| `updated_at` | `timestamptz` | Yes | Time the current profile was last updated. | `2026-09-02T08:15:00Z` |
| `version` | `integer` | Yes | Optimistic-concurrency version. Incremented whenever the profile changes. | `3` |

### Example row

```json
{
  "id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "team_id": "a1000000-0000-4000-8000-000000000001",
  "display_name": "Priya Kowalski",
  "email": "priya.kowalski@example.invalid",
  "person_number": "P-104827",
  "employment_type": "employee",
  "job_role": "Senior Software Engineer",
  "timezone": "America/New_York",
  "profile_status": "active",
  "active": true,
  "entitled": true,
  "created_at": "2026-09-02T07:45:00Z",
  "updated_at": "2026-09-02T08:15:00Z",
  "version": 3
}
```

### Important rules

- `person_number` should be unique when present.
- Never infer `employment_type` from the email address.
- Suggested `employment_type` values: `employee`, `contractor`.
- Suggested `profile_status` values: `active`, `pending_profile`, `inactive`.
- Access requires `active = true`, `entitled = true`, and an acceptable `profile_status`.
- Update with `WHERE id = ? AND version = ?`; return `409` when no row matches.

---

## 5. `external_identities`

### Why this table exists

External systems identify the same developer differently. `external_identities` connects those provider IDs to the internal `users.id`.

It helps the application:

- Use immutable Entra object IDs for login.
- Connect HR, learning, GitHub, Jira, gateway, and other records to one user.
- Avoid using mutable email addresses as keys.
- Quarantine ambiguous identity matches.
- Disable an old provider mapping without deleting history.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the mapping record. | `b2000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Conditional | Foreign key to `users.id`. It may be null for an unresolved mapping. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `provider` | `text` | Yes | Controlled provider name. | `entra` |
| `external_id` | `text` | Yes | Immutable or most stable identifier from the provider. | `00000000-0000-4000-8000-000000000101` |
| `tenant_id` | `text` | Conditional | Provider tenant or enterprise boundary. Particularly important for Entra. | `00000000-0000-4000-8000-000000000001` |
| `mapping_status` | `text` | Yes | State of the identity-to-user association. | `confirmed` |
| `created_at` | `timestamptz` | Yes | When the mapping was discovered or created. | `2026-09-02T07:45:00Z` |
| `updated_at` | `timestamptz` | Yes | When the mapping or status last changed. | `2026-09-02T07:46:10Z` |

### Example row

```json
{
  "id": "b2000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "provider": "entra",
  "external_id": "00000000-0000-4000-8000-000000000101",
  "tenant_id": "00000000-0000-4000-8000-000000000001",
  "mapping_status": "confirmed",
  "created_at": "2026-09-02T07:45:00Z",
  "updated_at": "2026-09-02T07:46:10Z"
}
```

### Important rules

- Unique constraint: `(provider, tenant_id, external_id)`.
- Suggested status values: `confirmed`, `pending`, `quarantined`, `disabled`.
- A `quarantined` mapping must not attribute activity to a user.
- Do not automatically resolve ambiguous matches using name similarity alone.

---

## 6. `learning_paths`

### Why this table exists

`learning_paths` stores one row for each version of a role-based learning path.

It helps the application:

- Provide different curricula for individual contributors and developer leads.
- Assign a specific published version to each user.
- Preserve old path versions after course requirements change.
- Keep completed historical recognition understandable.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for this exact path version. | `c3000000-0000-4000-8000-000000000001` |
| `path_key` | `text` | Yes | Stable key shared by versions of the same logical path. | `individual-contributor` |
| `name` | `text` | Yes | Display name of this path version. | `Individual Contributor Path` |
| `description` | `text` | Yes | User-facing explanation of the path. | `Hands-on AI learning for software engineers.` |
| `version_number` | `integer` | Yes | Increasing version of the logical path. | `2` |
| `target_role` | `text` | Yes | Role category for which the path is recommended. | `individual_contributor` |
| `active` | `boolean` | Yes | Whether this version can be assigned to new users. | `true` |
| `effective_from` | `timestamptz` | Yes | Time this version becomes assignable. | `2026-09-01T00:00:00Z` |
| `effective_to` | `timestamptz` | No | Time this version stops being assignable. Null means no end is scheduled. | `null` |

### Example row

```json
{
  "id": "c3000000-0000-4000-8000-000000000001",
  "path_key": "individual-contributor",
  "name": "Individual Contributor Path",
  "description": "Hands-on AI learning for software engineers.",
  "version_number": 2,
  "target_role": "individual_contributor",
  "active": true,
  "effective_from": "2026-09-01T00:00:00Z",
  "effective_to": null
}
```

### Important rules

- Unique constraint: `(path_key, version_number)`.
- Publishing a changed curriculum should create a new row, not overwrite the assigned version.
- Only one version of a logical path should normally be active for a given effective period.

---

## 7. `courses`

### Why this table exists

`courses` is the canonical course catalog used by the application.

It helps the application:

- Display a consistent course title and duration.
- Map provider progress to a known internal course.
- Control employee/contractor eligibility.
- Decide whether manual progress is permitted.
- Link courses to paths, progress, assessments, and badges.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Internal course primary key. | `d4000000-0000-4000-8000-000000000001` |
| `course_key` | `text` | Yes | Stable application key for the course. | `claude-code-in-action` |
| `title` | `text` | Yes | User-facing course title. | `Claude Code in Action` |
| `provider` | `text` | Yes | Provider or internal source. | `anthropic_academy` |
| `provider_course_id` | `text` | Conditional | Stable provider identifier used in progress feeds. | `course_2147` |
| `provider_url` | `text` | No | Approved external course page. | `https://anthropic.skilljar.com/claude-code-in-action` |
| `duration_minutes` | `integer` | Yes | Expected course duration in minutes. | `150` |
| `eligibility` | `text` | Yes | Employment group allowed to access the course. | `all` |
| `manual_progress_allowed` | `boolean` | Yes | Whether controlled manual progress is accepted. | `true` |
| `active` | `boolean` | Yes | Whether the course is available for current use. | `true` |
| `created_at` | `timestamptz` | Yes | When the catalog record was created. | `2026-08-28T14:00:00Z` |
| `updated_at` | `timestamptz` | Yes | When course configuration last changed. | `2026-09-01T09:00:00Z` |

### Example row

```json
{
  "id": "d4000000-0000-4000-8000-000000000001",
  "course_key": "claude-code-in-action",
  "title": "Claude Code in Action",
  "provider": "anthropic_academy",
  "provider_course_id": "course_2147",
  "provider_url": "https://anthropic.skilljar.com/claude-code-in-action",
  "duration_minutes": 150,
  "eligibility": "all",
  "manual_progress_allowed": true,
  "active": true,
  "created_at": "2026-08-28T14:00:00Z",
  "updated_at": "2026-09-01T09:00:00Z"
}
```

### Important rules

- `course_key` must be unique.
- `(provider, provider_course_id)` should be unique when `provider_course_id` is present.
- Suggested eligibility values: `all`, `employee`, `contractor`.
- `duration_minutes` must be greater than zero.
- An inactive course remains visible in historical progress.

---

## 8. `learning_path_courses`

### Why this table exists

This is the many-to-many relationship between learning-path versions and courses.

It helps the application:

- Place several courses into one path.
- Reuse a course in different paths.
- Order courses correctly.
- Group courses into badge stages.
- Identify required versus optional content.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the path-course relationship. | `e5000000-0000-4000-8000-000000000001` |
| `learning_path_id` | `uuid` | Yes | Foreign key to the exact `learning_paths` version. | `c3000000-0000-4000-8000-000000000001` |
| `course_id` | `uuid` | Yes | Foreign key to `courses.id`. | `d4000000-0000-4000-8000-000000000001` |
| `sequence_number` | `integer` | Yes | Position of the course within the path. | `7` |
| `stage` | `text` | Yes | Recognition stage associated with the course. | `second-coat` |
| `required` | `boolean` | Yes | Whether the course is mandatory for path completion. | `true` |

### Example row

```json
{
  "id": "e5000000-0000-4000-8000-000000000001",
  "learning_path_id": "c3000000-0000-4000-8000-000000000001",
  "course_id": "d4000000-0000-4000-8000-000000000001",
  "sequence_number": 7,
  "stage": "second-coat",
  "required": true
}
```

### Important rules

- Unique constraint: `(learning_path_id, course_id)`.
- Unique constraint: `(learning_path_id, sequence_number)`.
- `sequence_number` must be greater than zero.

---

## 9. `user_path_assignments`

### Why this table exists

`user_path_assignments` records which exact learning-path version was assigned to a developer.

It helps the application:

- Show the correct role-based path.
- Preserve the user's original requirements when a path changes.
- Create a new assignment after a role change.
- Track assignment and completion dates.
- Explain whether an assignment came from HR role mapping or an approved override.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the assignment. | `f6000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User receiving the path. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `learning_path_id` | `uuid` | Yes | Exact assigned path version. | `c3000000-0000-4000-8000-000000000001` |
| `status` | `text` | Yes | Current state of the assignment. | `active` |
| `assignment_reason` | `text` | Yes | Reason the path was selected. | `hr_role_mapping` |
| `assigned_at` | `timestamptz` | Yes | When the assignment became effective. | `2026-09-02T08:00:00Z` |
| `completed_at` | `timestamptz` | No | When all required path conditions were completed. | `null` |

### Example row

```json
{
  "id": "f6000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "learning_path_id": "c3000000-0000-4000-8000-000000000001",
  "status": "active",
  "assignment_reason": "hr_role_mapping",
  "assigned_at": "2026-09-02T08:00:00Z",
  "completed_at": null
}
```

### Important rules

- Suggested status values: `active`, `completed`, `superseded`, `cancelled`.
- Only one assignment should normally be active for the same user and logical path.
- Role changes should supersede old assignments, not delete them.

---

## 10. `course_progress`

### Why this table exists

`course_progress` stores the current state of a user's progress for one course.

It helps the application:

- Display course progress quickly.
- Accept provider-confirmed updates.
- Support controlled manual updates.
- Prevent manual progress from overriding authoritative provider completion.
- Detect concurrent edits.
- Retain bounded evidence for manual actions.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the progress record. | `11000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User whose progress is recorded. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `course_id` | `uuid` | Yes | Course being tracked. | `d4000000-0000-4000-8000-000000000001` |
| `percentage` | `integer` | Yes | Current completion percentage from 0 through 100. | `62` |
| `status` | `text` | Yes | Normalized progress state. | `in_progress` |
| `source` | `text` | Yes | Authority that supplied the current state. | `provider` |
| `evidence_metadata` | `jsonb` | No | Bounded manual evidence or provider reference metadata. | `{"providerEventId":"evt-8891"}` |
| `started_at` | `timestamptz` | No | First known course-start time. | `2026-08-30T13:20:00Z` |
| `completed_at` | `timestamptz` | No | Authoritative completion time. | `null` |
| `updated_at` | `timestamptz` | Yes | Time this projection last changed. | `2026-09-02T08:40:00Z` |
| `version` | `integer` | Yes | Optimistic-concurrency version. | `4` |

### Example row

```json
{
  "id": "11000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "course_id": "d4000000-0000-4000-8000-000000000001",
  "percentage": 62,
  "status": "in_progress",
  "source": "provider",
  "evidence_metadata": { "providerEventId": "evt-8891" },
  "started_at": "2026-08-30T13:20:00Z",
  "completed_at": null,
  "updated_at": "2026-09-02T08:40:00Z",
  "version": 4
}
```

### Important rules

- Unique constraint: `(user_id, course_id)`.
- `percentage` must be between 0 and 100.
- Suggested statuses: `not_started`, `in_progress`, `completed`.
- Suggested sources: `provider`, `manual`.
- Provider-confirmed completion cannot be downgraded by a manual request.
- Evidence must not contain secrets or unnecessary personal data.

---

## 11. `knowledge_checks`

### Why this table exists

`knowledge_checks` defines a versioned assessment belonging to a course.

It helps the application:

- Verify understanding rather than relying only on click-through completion.
- Store passing criteria.
- Preserve the exact question set associated with an attempt.
- Supply evidence for badges and points.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for this assessment version. | `12000000-0000-4000-8000-000000000001` |
| `course_id` | `uuid` | Yes | Course validated by the assessment. | `d4000000-0000-4000-8000-000000000001` |
| `title` | `text` | Yes | User-facing assessment title. | `Responsible AI Essentials` |
| `version_number` | `integer` | Yes | Increasing version for this assessment. | `1` |
| `passing_score` | `integer` | Yes | Minimum percentage required to pass. | `80` |
| `questions` | `jsonb` | Yes | Bounded, versioned question and answer definition. | See below. |
| `active` | `boolean` | Yes | Whether new attempts can use this version. | `true` |

### Example `questions`

```json
[
  {
    "id": "q1",
    "type": "single_choice",
    "text": "Which information must not be stored?",
    "options": [
      { "id": "a", "text": "Course completion" },
      { "id": "b", "text": "Raw AI prompts" }
    ],
    "correctOptionIds": ["b"],
    "points": 1
  }
]
```

### Example row

```json
{
  "id": "12000000-0000-4000-8000-000000000001",
  "course_id": "d4000000-0000-4000-8000-000000000001",
  "title": "Responsible AI Essentials",
  "version_number": 1,
  "passing_score": 80,
  "questions": "bounded question array",
  "active": true
}
```

### Important rules

- Unique constraint: `(course_id, version_number)`.
- `passing_score` must be between 0 and 100.
- Correct answers must be removed from browser-facing question responses.
- Published question definitions should not be edited; create a new version.

---

## 12. `knowledge_check_attempts`

### Why this table exists

This table records each submitted assessment attempt.

It helps the application:

- Show the user's score and pass/fail result.
- Support controlled retakes.
- Prove which assessment version was completed.
- Supply evidence for recognition.
- Review submitted answers when permitted.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the attempt. | `13000000-0000-4000-8000-000000000001` |
| `knowledge_check_id` | `uuid` | Yes | Exact assessment version attempted. | `12000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User submitting the attempt. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `attempt_number` | `integer` | Yes | User's sequential attempt number for this check. | `2` |
| `submitted_answers` | `jsonb` | Yes | Question IDs and selected/entered answers. | `[{"questionId":"q1","optionIds":["b"]}]` |
| `score` | `integer` | Yes | Calculated percentage score. | `92` |
| `passed` | `boolean` | Yes | Whether the score met the stored passing threshold. | `true` |
| `submitted_at` | `timestamptz` | Yes | Time the final attempt was submitted. | `2026-08-28T15:12:00Z` |

### Example row

```json
{
  "id": "13000000-0000-4000-8000-000000000001",
  "knowledge_check_id": "12000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "attempt_number": 2,
  "submitted_answers": [{ "questionId": "q1", "optionIds": ["b"] }],
  "score": 92,
  "passed": true,
  "submitted_at": "2026-08-28T15:12:00Z"
}
```

### Important rules

- Unique constraint: `(knowledge_check_id, user_id, attempt_number)`.
- `score` must be between 0 and 100.
- `attempt_number` must be greater than zero.
- Once submitted and used as recognition evidence, an attempt should be immutable.

---

## 13. `badges`

### Why this table exists

`badges` defines the recognition badges shown on the paint-chip badge wall.

It helps the application:

- Display badge name, description, and brand color.
- Evaluate a versioned award rule.
- Disable an obsolete definition without removing earned badges.
- Keep scoring behavior traceable after rules change.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the badge definition. | `14000000-0000-4000-8000-000000000001` |
| `badge_key` | `text` | Yes | Stable program key. | `second-coat` |
| `name` | `text` | Yes | User-facing badge name. | `Second Coat` |
| `description` | `text` | Yes | Skill or achievement represented by the badge. | `Demonstrates agent workflow capability.` |
| `color_name` | `text` | Yes | Paint-inspired display color name. | `Naval` |
| `color_code` | `text` | Yes | Approved CSS/hex display color. | `#2E3B4E` |
| `rule_version` | `integer` | Yes | Version number of the current stored rule. | `1` |
| `rule_definition` | `jsonb` | Yes | Machine-readable completion criteria. | `{"requiredCourseIds":["..."]}` |
| `active` | `boolean` | Yes | Whether the rule can create new awards. | `true` |

### Example row

```json
{
  "id": "14000000-0000-4000-8000-000000000001",
  "badge_key": "second-coat",
  "name": "Second Coat",
  "description": "Demonstrates agent workflow capability.",
  "color_name": "Naval",
  "color_code": "#2E3B4E",
  "rule_version": 1,
  "rule_definition": {
    "requiredCourseKeys": ["claude-code-in-action"],
    "minimumKnowledgeScore": 80
  },
  "active": true
}
```

### Important rules

- `badge_key` must be unique.
- `rule_version` must be greater than zero.
- Rules must be validated against a versioned schema.
- Client approval is required before illustrative rules become production rules.

---

## 14. `user_badges`

### Why this table exists

`user_badges` records an awarded badge for a specific user.

It helps the application:

- Render earned badges on the dashboard.
- Preserve award evidence and time.
- Prevent duplicate awards when workers retry.
- Reverse or invalidate an award without deleting history.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the award. | `15000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User receiving the badge. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `badge_id` | `uuid` | Yes | Awarded badge definition. | `14000000-0000-4000-8000-000000000001` |
| `award_key` | `text` | Yes | Deterministic unique key preventing duplicate awards. | `badge:second-coat:user:7c986e20:rule:1` |
| `evidence` | `jsonb` | Yes | IDs and versions of progress/assessment records supporting the award. | `{"courseProgressIds":["..."],"attemptId":"..."}` |
| `awarded_at` | `timestamptz` | Yes | Time the badge was awarded. | `2026-09-02T08:45:00Z` |
| `status` | `text` | Yes | Current award state. | `active` |

### Example row

```json
{
  "id": "15000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "badge_id": "14000000-0000-4000-8000-000000000001",
  "award_key": "badge:second-coat:user:7c986e20:rule:1",
  "evidence": {
    "courseProgressIds": ["11000000-0000-4000-8000-000000000001"],
    "knowledgeAttemptId": "13000000-0000-4000-8000-000000000001"
  },
  "awarded_at": "2026-09-02T08:45:00Z",
  "status": "active"
}
```

### Important rules

- `award_key` must be unique.
- Suggested statuses: `active`, `reversed`.
- Do not delete an award used by the point ledger; reverse it and create a corresponding point reversal.

---

## 15. `point_ledger`

### Why this table exists

`point_ledger` is the append-only history of point awards, reversals, and corrections.

It helps the application:

- Explain the user's total points.
- Prevent duplicate point awards.
- Correct a previous award without silently editing history.
- Associate points with badges, certifications, assessments, or approved activity.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the ledger entry. | `16000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User whose point balance changes. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `entry_type` | `text` | Yes | Nature of the ledger change. | `award` |
| `points` | `integer` | Yes | Signed point amount. Positive adds points; negative reverses them. | `1500` |
| `reason_code` | `text` | Yes | Stable reason understood by business logic. | `badge_earned` |
| `award_key` | `text` | Yes | Deterministic unique key preventing duplicate ledger entries. | `points:badge-award:15000000` |
| `evidence_type` | `text` | Yes | Type of source record supporting the entry. | `user_badge` |
| `evidence_id` | `uuid` | Yes | ID of the supporting record. | `15000000-0000-4000-8000-000000000001` |
| `created_at` | `timestamptz` | Yes | Time the entry was recorded. | `2026-09-02T08:45:01Z` |

### Example award

```json
{
  "id": "16000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "entry_type": "award",
  "points": 1500,
  "reason_code": "badge_earned",
  "award_key": "points:badge-award:15000000",
  "evidence_type": "user_badge",
  "evidence_id": "15000000-0000-4000-8000-000000000001",
  "created_at": "2026-09-02T08:45:01Z"
}
```

### Example reversal

```json
{
  "entry_type": "reversal",
  "points": -1500,
  "reason_code": "badge_reversed",
  "award_key": "points:badge-reversal:15000000"
}
```

### Important rules

- `award_key` must be unique.
- `points` must not equal zero.
- Suggested entry types: `award`, `reversal`, `correction`.
- Existing ledger rows should not be updated to change the balance.
- Total points are `SUM(points)` for the user.

---

## 16. `user_certifications`

### Why this table exists

`user_certifications` stores approved external certifications held by a user.

It helps the application:

- Display verified credentials.
- Check expiration.
- Provide recognition evidence.
- Prevent multiple imports of the same credential.
- Link to issuer verification when permitted.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the user's credential. | `17000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | Credential holder. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `certification_key` | `text` | Yes | Stable program key for the credential type. | `gh-300` |
| `certification_name` | `text` | Yes | Full certification display name. | `GitHub Copilot Certification` |
| `issuer` | `text` | Yes | Credential issuer. | `GitHub` |
| `credential_id` | `text` | Conditional | Issuer or verification-platform credential ID. | `credly-8f42c9` |
| `verification_url` | `text` | No | Approved issuer verification link. | `https://www.credly.com/badges/example` |
| `verification_status` | `text` | Yes | Whether the credential has been verified. | `verified` |
| `issued_at` | `timestamptz` | Yes | Credential issue time. | `2026-06-10T00:00:00Z` |
| `expires_at` | `timestamptz` | No | Credential expiration time, if any. | `2028-06-10T00:00:00Z` |
| `verified_at` | `timestamptz` | No | Time the application or approved process verified it. | `2026-09-01T12:00:00Z` |

### Example row

```json
{
  "id": "17000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "certification_key": "gh-300",
  "certification_name": "GitHub Copilot Certification",
  "issuer": "GitHub",
  "credential_id": "credly-8f42c9",
  "verification_url": "https://www.credly.com/badges/example",
  "verification_status": "verified",
  "issued_at": "2026-06-10T00:00:00Z",
  "expires_at": "2028-06-10T00:00:00Z",
  "verified_at": "2026-09-01T12:00:00Z"
}
```

### Important rules

- Suggested statuses: `pending`, `verified`, `rejected`, `expired`.
- Unique constraint should cover `(issuer, credential_id)` when a credential ID is present.
- Only verified, unexpired credentials should generate approved recognition.

---

## 17. `weekly_activity`

### Why this table exists

`weekly_activity` stores an approved weekly summary of AI-tool activity for one user.

It helps the application:

- Render the 12-week activity chart.
- Determine weekly-active status.
- Display tool usage mix.
- Show token/cost summaries if approved.
- Communicate whether the dataset is current, stale, partial, or unavailable.
- Calculate anonymized benchmarks without storing raw prompts.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the weekly summary. | `18000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User represented by the summary. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `week_start` | `date` | Yes | Start date of the standardized reporting week. | `2026-08-24` |
| `qualifying_days` | `integer` | Yes | Days meeting the approved weekly activity definition. | `4` |
| `request_count` | `integer` | Yes | Count of approved qualifying requests/events. | `146` |
| `input_tokens` | `bigint` | Conditional | Approved input-token total. | `184000` |
| `output_tokens` | `bigint` | Conditional | Approved output-token total. | `72000` |
| `estimated_cost` | `numeric(14,4)` | Conditional | Estimated approved AI cost for the week. | `23.4800` |
| `tool_mix` | `jsonb` | Yes | Normalized percentage or count per approved tool. | See below. |
| `source` | `text` | Yes | Gold dataset or approved source producing the aggregate. | `databricks_gold_ai_usage_v1` |
| `data_state` | `text` | Yes | Quality/freshness state of this weekly record. | `current` |
| `data_through` | `timestamptz` | Yes | Latest source event included in the summary. | `2026-08-30T23:59:59Z` |

### Example `tool_mix`

```json
[
  { "tool": "GitHub Copilot", "percentage": 42, "qualifyingDays": 4 },
  { "tool": "Claude", "percentage": 28, "qualifyingDays": 3 },
  { "tool": "Codex", "percentage": 18, "qualifyingDays": 2 },
  { "tool": "Other", "percentage": 12, "qualifyingDays": 1 }
]
```

### Example row

```json
{
  "id": "18000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "week_start": "2026-08-24",
  "qualifying_days": 4,
  "request_count": 146,
  "input_tokens": 184000,
  "output_tokens": 72000,
  "estimated_cost": 23.48,
  "tool_mix": "normalized approved tool list",
  "source": "databricks_gold_ai_usage_v1",
  "data_state": "current",
  "data_through": "2026-08-30T23:59:59Z"
}
```

### Important rules

- Unique constraint: `(user_id, week_start)`.
- `qualifying_days` must be between 0 and 7.
- Counts and token values must be nonnegative.
- Suggested data states: `current`, `stale`, `partial`, `unavailable`.
- `tool_mix` percentages should total 100 when percentages are used.
- Never store raw prompts in this table.

---

## 18. `idempotency_records`

### Why this table exists

`idempotency_records` ensures that retrying the same logical command does not apply it twice.

It helps the application:

- Handle double-clicks safely.
- Handle browser/network retries.
- Replay supported offline operations safely.
- Return the original response for a previously completed operation.
- Prevent duplicate progress, badges, and points.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the idempotency record. | `19000000-0000-4000-8000-000000000001` |
| `user_id` | `uuid` | Yes | User initiating the operation. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `operation_id` | `text` | Yes | Client-generated stable ID reused on retries. | `web-01J6Y5PKZ0B9GQH7YJ2T8B0KJD` |
| `operation_type` | `text` | Yes | Type of command being protected. | `update_course_progress` |
| `request_hash` | `text` | Yes | Hash of the normalized request body. | `sha256:36ca...8b4e` |
| `response_status` | `integer` | Yes | HTTP status returned for the completed operation. | `200` |
| `response_body` | `jsonb` | Yes | Bounded response returned to identical retries. | `{"courseId":"...","version":5}` |
| `created_at` | `timestamptz` | Yes | When the operation was first processed. | `2026-09-02T08:40:00Z` |
| `expires_at` | `timestamptz` | Conditional | Earliest approved expiration time for this record. | `2026-10-02T08:40:00Z` |

### Example row

```json
{
  "id": "19000000-0000-4000-8000-000000000001",
  "user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "operation_id": "web-01J6Y5PKZ0B9GQH7YJ2T8B0KJD",
  "operation_type": "update_course_progress",
  "request_hash": "sha256:36ca...8b4e",
  "response_status": 200,
  "response_body": { "courseId": "d4000000-0000-4000-8000-000000000001", "version": 5 },
  "created_at": "2026-09-02T08:40:00Z",
  "expires_at": "2026-10-02T08:40:00Z"
}
```

### Important rules

- Unique constraint: `(user_id, operation_id)`.
- Reusing an operation ID with a different `request_hash` must return a conflict.
- Store idempotency and business changes in the same transaction.
- Retention must be longer than the maximum supported offline/retry period.

---

## 19. `audit_events`

### Why this table exists

`audit_events` is the append-oriented record of important security and business actions.

It helps the application:

- Explain who changed a record and when.
- Trace manual course completions.
- Record authorization successes and failures.
- Investigate unexpected recognition or data changes.
- Provide operational and compliance evidence.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the audit event. | `1a000000-0000-4000-8000-000000000001` |
| `actor_user_id` | `uuid` | Conditional | User or service identity performing the action. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `subject_user_id` | `uuid` | Conditional | User whose data was affected. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `action` | `text` | Yes | Stable action name. | `course_progress.updated` |
| `resource_type` | `text` | Yes | Type of affected record. | `course_progress` |
| `resource_id` | `uuid` | Conditional | ID of the affected record. | `11000000-0000-4000-8000-000000000001` |
| `outcome` | `text` | Yes | Result of the action. | `success` |
| `correlation_id` | `text` | Yes | Request/job identifier joining related logs and events. | `req-01J6Y5R3GXE5TQ1S16CB2S6JFR` |
| `metadata` | `jsonb` | No | Redacted contextual information such as old/new versions and source. | `{"oldVersion":4,"newVersion":5}` |
| `occurred_at` | `timestamptz` | Yes | Time the audited action occurred. | `2026-09-02T08:40:00Z` |

### Example row

```json
{
  "id": "1a000000-0000-4000-8000-000000000001",
  "actor_user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "subject_user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "action": "course_progress.updated",
  "resource_type": "course_progress",
  "resource_id": "11000000-0000-4000-8000-000000000001",
  "outcome": "success",
  "correlation_id": "req-01J6Y5R3GXE5TQ1S16CB2S6JFR",
  "metadata": { "oldVersion": 4, "newVersion": 5, "source": "manual" },
  "occurred_at": "2026-09-02T08:40:00Z"
}
```

### Important rules

- Suggested outcomes: `success`, `denied`, `failed`.
- Audit events should be append-only.
- Metadata must exclude access tokens, secrets, raw prompts, and unnecessary personal data.
- Service-generated actions should use an approved service actor representation.

---

## 20. `outbox_events`

### Why this table exists

`outbox_events` stores application changes waiting to be exported to Databricks Bronze or processed asynchronously.

It helps the application:

- Preserve user actions during a Databricks or worker outage.
- Commit business data and export evidence in one transaction.
- Retry safely.
- Export bounded, versioned event contracts.
- Know which events remain pending or failed.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key and stable event ID. | `1b000000-0000-4000-8000-000000000001` |
| `actor_user_id` | `uuid` | Conditional | User whose action caused the event. Null for scheduled/system events. | `7c986e20-43a2-4a86-817d-6effc840ca91` |
| `integration_run_id` | `uuid` | No | Export run that claimed or exported the event. | `1c000000-0000-4000-8000-000000000001` |
| `aggregate_type` | `text` | Yes | Domain record category. | `course_progress` |
| `aggregate_id` | `uuid` | Yes | ID of the affected domain record. | `11000000-0000-4000-8000-000000000001` |
| `event_type` | `text` | Yes | Version-independent event name. | `course_progress.updated` |
| `payload` | `jsonb` | Yes | Versioned canonical event content. | See below. |
| `contract_version` | `text` | Yes | Schema version used by the payload. | `1.0` |
| `status` | `text` | Yes | Current export state. | `pending` |
| `attempt_count` | `integer` | Yes | Number of export attempts. | `0` |
| `created_at` | `timestamptz` | Yes | When the business transaction created the event. | `2026-09-02T08:40:00Z` |
| `exported_at` | `timestamptz` | No | When the destination acknowledged the event. | `null` |

### Example payload

```json
{
  "eventId": "1b000000-0000-4000-8000-000000000001",
  "userId": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "courseId": "d4000000-0000-4000-8000-000000000001",
  "percentage": 62,
  "status": "in_progress",
  "source": "manual",
  "occurredAt": "2026-09-02T08:40:00Z"
}
```

### Example row

```json
{
  "id": "1b000000-0000-4000-8000-000000000001",
  "actor_user_id": "7c986e20-43a2-4a86-817d-6effc840ca91",
  "integration_run_id": null,
  "aggregate_type": "course_progress",
  "aggregate_id": "11000000-0000-4000-8000-000000000001",
  "event_type": "course_progress.updated",
  "payload": "canonical event object",
  "contract_version": "1.0",
  "status": "pending",
  "attempt_count": 0,
  "created_at": "2026-09-02T08:40:00Z",
  "exported_at": null
}
```

### Important rules

- Event `id` is also the external idempotency key.
- Suggested statuses: `pending`, `processing`, `exported`, `failed`.
- `attempt_count` must be nonnegative.
- The domain update and event insert must occur in one PostgreSQL transaction.
- Do not mark an event exported before the required acknowledgement.

---

## 21. `integration_runs`

### Why this table exists

`integration_runs` is the consolidated operational record for provider and Databricks synchronization.

It helps the application:

- Prevent duplicate logical nightly runs.
- Record import and export status.
- Store the latest successful checkpoint.
- Reconcile expected versus actual record counts and checksums.
- Calculate data freshness.
- Surface partial, stale, and unavailable states.
- Retain a bounded error summary for operations.

### Columns

| Column | Type | Required | Meaning | Example |
|---|---|---:|---|---|
| `id` | `uuid` | Yes | Primary key for the synchronization run. | `1c000000-0000-4000-8000-000000000001` |
| `connector` | `text` | Yes | Provider or dataset being synchronized. | `databricks_gold_ai_usage` |
| `direction` | `text` | Yes | Whether data is entering or leaving the application. | `import` |
| `logical_run_key` | `text` | Yes | Deterministic unique key for the intended run. | `databricks_gold_ai_usage:import:2026-09-02` |
| `status` | `text` | Yes | Current run state. | `succeeded` |
| `checkpoint` | `text` | No | Cursor, sequence, or manifest version accepted after success. | `manifest-2026-09-02-001` |
| `expected_count` | `integer` | No | Record count declared by the source/manifest. | `1842` |
| `actual_count` | `integer` | No | Valid records processed by the application. | `1842` |
| `expected_checksum` | `text` | No | Source-provided reconciliation checksum. | `sha256:1d75...a92f` |
| `actual_checksum` | `text` | No | Checksum calculated by the application. | `sha256:1d75...a92f` |
| `data_state` | `text` | Yes | User-facing freshness/quality state after the run. | `current` |
| `error_summary` | `jsonb` | No | Bounded redacted counts and error codes. | `{"rejected":0,"warnings":2}` |
| `started_at` | `timestamptz` | Yes | Time processing began. | `2026-09-02T03:00:00Z` |
| `completed_at` | `timestamptz` | No | Time the run reached a terminal state. | `2026-09-02T03:08:24Z` |
| `data_through` | `timestamptz` | No | Latest source event represented by the imported data. | `2026-09-01T23:59:59Z` |

### Example row

```json
{
  "id": "1c000000-0000-4000-8000-000000000001",
  "connector": "databricks_gold_ai_usage",
  "direction": "import",
  "logical_run_key": "databricks_gold_ai_usage:import:2026-09-02",
  "status": "succeeded",
  "checkpoint": "manifest-2026-09-02-001",
  "expected_count": 1842,
  "actual_count": 1842,
  "expected_checksum": "sha256:1d75...a92f",
  "actual_checksum": "sha256:1d75...a92f",
  "data_state": "current",
  "error_summary": { "rejected": 0, "warnings": 2 },
  "started_at": "2026-09-02T03:00:00Z",
  "completed_at": "2026-09-02T03:08:24Z",
  "data_through": "2026-09-01T23:59:59Z"
}
```

### Important rules

- `logical_run_key` must be unique.
- Suggested directions: `import`, `export`.
- Suggested statuses: `queued`, `running`, `succeeded`, `partial`, `failed`.
- Suggested data states: `current`, `stale`, `partial`, `unavailable`.
- Checkpoint must not advance until validation and reconciliation succeed.
- Counts must be nonnegative.
- Error metadata must not contain secrets or raw provider records.

---

## 22. How the tables work together

### First login

```text
Entra login
  -> external_identities finds immutable Entra mapping
  -> users supplies profile, team, active status and entitlement
  -> user_path_assignments supplies the assigned path version
  -> audit_events records the successful login/projection
```

### Course progress update

```text
Client sends operation ID and expected version
  -> idempotency_records checks for a retry
  -> course_progress updates with optimistic concurrency
  -> audit_events records the action
  -> outbox_events records the export event
  -> all records commit in one transaction
```

### Knowledge check and recognition

```text
knowledge_checks supplies the question version
  -> knowledge_check_attempts records score and answers
  -> badge worker evaluates badges.rule_definition
  -> user_badges records an exactly-once award
  -> point_ledger records an exactly-once point entry
```

### Personal dashboard

```text
users + teams
  -> identity and profile

user_path_assignments + learning_paths + courses + course_progress
  -> learning progress

user_badges + badges + point_ledger + user_certifications
  -> recognition

weekly_activity
  -> 12-week activity, tool mix and data quality

integration_runs
  -> overall freshness and synchronization status
```

### Databricks synchronization

```text
outbox_events pending rows
  -> worker creates integration_runs export record
  -> bounded batch sent to Bronze
  -> acknowledgement marks outbox rows exported

Gold manifest available
  -> worker creates integration_runs import record
  -> validates and applies weekly_activity or provider progress
  -> compares counts and checksums
  -> advances checkpoint only after success
```

## 23. Recommended indexes

Primary and unique constraints create important indexes automatically. Add these query indexes initially:

```text
users(team_id, active)
external_identities(user_id, provider)
learning_paths(path_key, active)
learning_path_courses(learning_path_id, sequence_number)
user_path_assignments(user_id, status)
course_progress(user_id, status)
course_progress(course_id, status)
knowledge_check_attempts(user_id, submitted_at DESC)
user_badges(user_id, status)
point_ledger(user_id, created_at DESC)
user_certifications(user_id, verification_status)
weekly_activity(user_id, week_start DESC)
audit_events(subject_user_id, occurred_at DESC)
audit_events(correlation_id)
outbox_events(status, created_at)
integration_runs(connector, started_at DESC)
```

Do not add indexes speculatively beyond known queries. Review actual query plans after realistic data-volume testing.

## 24. Final implementation guidance

- Create tables by migration group, not all at once.
- Add every foreign key and essential unique/check constraint in the database.
- Use transactions for progress, audit, idempotency, outbox, badge, and ledger changes.
- Treat JSON structures as versioned contracts and validate them before storage.
- Never store raw prompts, credentials, secrets, or unnecessary source code.
- Preserve historical learning and recognition evidence.
- Use status/reversal records instead of destructive deletion for auditable data.
- Confirm client-owned rules before finalizing eligibility, badges, points, tiers, activity thresholds, retention, and privacy suppression.

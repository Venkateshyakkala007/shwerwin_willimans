-- Local-only credential and opaque session storage. Authentication is additive to V3.
CREATE TABLE v3.local_credential (
 user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 password_hash text NOT NULL,
 failed_attempts integer NOT NULL DEFAULT 0 CHECK(failed_attempts >= 0),
 locked_until timestamptz,
 password_updated_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE v3.auth_session (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK(token_hash ~ '^[0-9a-f]{64}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 revoked_at timestamptz,
 last_seen_at timestamptz NOT NULL DEFAULT now(),
 CHECK(expires_at > created_at),
 CHECK(revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX auth_session_user_idx ON v3.auth_session(user_id);
CREATE INDEX auth_session_expiry_idx ON v3.auth_session(expires_at) WHERE revoked_at IS NULL;

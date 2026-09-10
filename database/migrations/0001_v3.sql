-- Additive V3 operational and imported analytical contracts. Legacy evidence remains unchanged.
CREATE SCHEMA v3;
CREATE TABLE v3.organization_unit (
 id uuid PRIMARY KEY, parent_id uuid REFERENCES v3.organization_unit(id), kind text NOT NULL CHECK(kind IN ('organization','department','team')), name text NOT NULL
);
CREATE TABLE v3.membership (
 user_id uuid NOT NULL REFERENCES users(id), unit_id uuid NOT NULL REFERENCES v3.organization_unit(id), effective_from timestamptz NOT NULL DEFAULT now(), effective_to timestamptz,
 PRIMARY KEY(user_id,unit_id,effective_from), CHECK(effective_to IS NULL OR effective_to>effective_from)
);
CREATE TABLE v3.scope_grant (
 user_id uuid NOT NULL REFERENCES users(id), scope_id uuid NOT NULL REFERENCES v3.organization_unit(id), permission text NOT NULL CHECK(permission IN ('aggregate','people','detail','cost','operate')), PRIMARY KEY(user_id,scope_id,permission)
);
CREATE TABLE v3.course_version (
 id uuid PRIMARY KEY, course_id uuid NOT NULL REFERENCES courses(id), version_number integer NOT NULL CHECK(version_number>0), title text NOT NULL,
 access_tier text NOT NULL CHECK(access_tier IN ('public','internal','licensed')), public_access_verified boolean NOT NULL DEFAULT false, public_review_until timestamptz,
 completion_mode text NOT NULL DEFAULT 'self_attested' CHECK(completion_mode='self_attested'), api_enabled boolean NOT NULL DEFAULT false CHECK(NOT api_enabled),
 repeatable boolean NOT NULL DEFAULT true, active boolean NOT NULL DEFAULT true, published_at timestamptz NOT NULL DEFAULT now(), UNIQUE(course_id,version_number), UNIQUE(id,course_id)
);
CREATE TABLE v3.content_entitlement (user_id uuid NOT NULL REFERENCES users(id), course_version_id uuid NOT NULL REFERENCES v3.course_version(id), PRIMARY KEY(user_id,course_version_id));
CREATE TABLE v3.assignment (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), course_version_id uuid NOT NULL REFERENCES v3.course_version(id), required boolean NOT NULL DEFAULT true,
 assigned_at timestamptz NOT NULL DEFAULT now(), due_at timestamptz, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','cancelled','superseded')), UNIQUE(user_id,course_version_id), UNIQUE(id,user_id,course_version_id), CHECK(due_at IS NULL OR due_at>=assigned_at)
);
CREATE TABLE v3.enrollment (
 id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id), course_version_id uuid NOT NULL REFERENCES v3.course_version(id), assignment_id uuid,
 attempt_number integer NOT NULL CHECK(attempt_number>0), status text NOT NULL DEFAULT 'enrolled' CHECK(status IN ('enrolled','in_progress','completed','withdrawn')),
 percentage integer NOT NULL DEFAULT 0 CHECK(percentage BETWEEN 0 AND 100), version integer NOT NULL DEFAULT 1 CHECK(version>0),
 enrolled_at timestamptz NOT NULL DEFAULT now(), started_at timestamptz, completed_at timestamptz, withdrawn_at timestamptz, completion_authority text, attestation_id uuid,
 UNIQUE(user_id,course_version_id,attempt_number), UNIQUE(id,user_id,course_version_id),
 FOREIGN KEY(assignment_id,user_id,course_version_id) REFERENCES v3.assignment(id,user_id,course_version_id),
 CHECK(status<>'completed' OR (percentage=100 AND completed_at IS NOT NULL AND completion_authority IS NOT NULL AND completion_authority='self_attested' AND attestation_id IS NOT NULL)),
 CHECK(status<>'withdrawn' OR withdrawn_at IS NOT NULL)
);
CREATE UNIQUE INDEX enrollment_one_open ON v3.enrollment(user_id,course_version_id) WHERE status IN ('enrolled','in_progress');
CREATE TABLE v3.attestation (
 id uuid PRIMARY KEY, enrollment_id uuid NOT NULL, user_id uuid NOT NULL, course_version_id uuid NOT NULL,
 statement text NOT NULL, claimed_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), kind text NOT NULL CHECK(kind IN ('completion','retraction')), retracts_id uuid REFERENCES v3.attestation(id),
 FOREIGN KEY(enrollment_id,user_id,course_version_id) REFERENCES v3.enrollment(id,user_id,course_version_id), UNIQUE(id,enrollment_id,user_id,course_version_id),
 CHECK((kind='completion' AND retracts_id IS NULL) OR (kind='retraction' AND retracts_id IS NOT NULL))
);
CREATE UNIQUE INDEX attestation_once_retracted ON v3.attestation(retracts_id) WHERE retracts_id IS NOT NULL;
ALTER TABLE v3.enrollment ADD FOREIGN KEY(attestation_id,id,user_id,course_version_id) REFERENCES v3.attestation(id,enrollment_id,user_id,course_version_id) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE v3.learning_event (
 id uuid PRIMARY KEY, enrollment_id uuid NOT NULL REFERENCES v3.enrollment(id), user_id uuid NOT NULL REFERENCES users(id), kind text NOT NULL,
 occurred_at timestamptz NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL
);
CREATE TABLE v3.job (
 id uuid PRIMARY KEY, kind text NOT NULL CHECK(kind IN ('learning_event','publication','export')), logical_key text NOT NULL UNIQUE, owner_id uuid REFERENCES users(id),
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','succeeded','failed')), payload jsonb NOT NULL DEFAULT '{}', result jsonb,
 attempts integer NOT NULL DEFAULT 0, fencing_token bigint NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(), lease_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, error text
);
CREATE INDEX job_claim_idx ON v3.job(status,available_at);
CREATE TABLE v3.outbox_receipt (event_id uuid PRIMARY KEY REFERENCES outbox_events(id), job_id uuid NOT NULL REFERENCES v3.job(id), received_at timestamptz NOT NULL DEFAULT now(), authority text NOT NULL CHECK(authority='synthetic_local_sink'));
CREATE TABLE v3.policy (
 id text PRIMARY KEY, catalogue text NOT NULL CHECK(catalogue='M25.1'), state text NOT NULL CHECK(state IN ('sample_only','approved','retired')), evidence_profile text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE v3.metric_definition (
 id text PRIMARY KEY, group_code text NOT NULL CHECK(group_code IN ('E','A','T','F','Q')), name text NOT NULL, weight_bps integer NOT NULL CHECK(weight_bps BETWEEN 0 AND 10000), unit text NOT NULL, normalizer text NOT NULL, description text NOT NULL,
 CHECK((id IN ('E5','T1','F5') AND weight_bps=0) OR (id NOT IN ('E5','T1','F5') AND weight_bps>0))
);
CREATE TABLE v3.publication (
 id uuid PRIMARY KEY, policy_id text NOT NULL REFERENCES v3.policy(id), source text NOT NULL CHECK(source='synthetic_fixture'), state text NOT NULL CHECK(state IN ('staging','published')),
 manifest_hash text NOT NULL, row_count integer NOT NULL CHECK(row_count>=0), created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, fixture_version text NOT NULL,
 CHECK(state<>'published' OR published_at IS NOT NULL)
);
CREATE TABLE v3.serving_pointer (slot text PRIMARY KEY CHECK(slot='main'), publication_id uuid NOT NULL REFERENCES v3.publication(id));
CREATE TABLE v3.metric_projection (
 publication_id uuid NOT NULL REFERENCES v3.publication(id), subject_id uuid NOT NULL, metric_id text NOT NULL REFERENCES v3.metric_definition(id),
 raw_value numeric, normalized_score numeric(5,2) CHECK(normalized_score BETWEEN 0 AND 100), contribution numeric(7,4), status text NOT NULL CHECK(status IN ('sample_backed','unavailable','normalization_pending','suppressed')),
 sample_size integer NOT NULL CHECK(sample_size>=0), evidence text NOT NULL, period_start date NOT NULL, period_end date NOT NULL, PRIMARY KEY(publication_id,subject_id,metric_id),
 CHECK(status NOT IN ('unavailable','suppressed') OR (raw_value IS NULL AND normalized_score IS NULL AND contribution IS NULL)), CHECK(period_end>period_start)
);
CREATE TABLE v3.group_projection (
 publication_id uuid NOT NULL REFERENCES v3.publication(id), subject_id uuid NOT NULL, group_code text NOT NULL,
 score numeric(5,2) CHECK(score BETWEEN 0 AND 100), status text NOT NULL CHECK(status IN ('sample_backed','unavailable','normalization_pending','suppressed')), PRIMARY KEY(publication_id,subject_id,group_code), CHECK(status='sample_backed' OR score IS NULL)
);
CREATE TABLE v3.consumption_projection (
 publication_id uuid NOT NULL REFERENCES v3.publication(id), user_id uuid NOT NULL REFERENCES users(id), month date NOT NULL,
 tokens bigint CHECK(tokens>=0), credits numeric(16,4) CHECK(credits>=0), allocation numeric(16,4) CHECK(allocation>=0), cost numeric(16,4), currency text,
 authority text NOT NULL, coverage text NOT NULL, PRIMARY KEY(publication_id,user_id,month), CHECK(EXTRACT(DAY FROM month)=1), CHECK((cost IS NULL AND currency IS NULL) OR (cost IS NOT NULL AND currency IS NOT NULL))
);
CREATE TABLE v3.fixture (subject_id uuid PRIMARY KEY, rows jsonb NOT NULL, consumption jsonb, version text NOT NULL);
CREATE TABLE v3.programme_repository (id uuid PRIMARY KEY, repository_key text NOT NULL UNIQUE, primary_branch text NOT NULL, synthetic boolean NOT NULL DEFAULT true);
CREATE TABLE v3.champion (user_id uuid NOT NULL REFERENCES users(id), repository_id uuid NOT NULL REFERENCES v3.programme_repository(id), effective_from timestamptz NOT NULL, effective_to timestamptz, PRIMARY KEY(user_id,repository_id,effective_from));
CREATE TABLE v3.rate_limit (user_id uuid NOT NULL REFERENCES users(id), bucket text NOT NULL, window_start timestamptz NOT NULL, count integer NOT NULL CHECK(count>0), PRIMARY KEY(user_id,bucket,window_start));
CREATE TABLE v3.mutation_receipt (user_id uuid NOT NULL REFERENCES users(id), operation_id text NOT NULL, request_hash text NOT NULL, response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,operation_id));
CREATE FUNCTION v3.reject_evidence_update() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Evidence is append-only'; END $$;
CREATE TRIGGER attestation_immutable BEFORE UPDATE OR DELETE ON v3.attestation FOR EACH ROW EXECUTE FUNCTION v3.reject_evidence_update();
CREATE TRIGGER learning_event_immutable BEFORE UPDATE OR DELETE ON v3.learning_event FOR EACH ROW EXECUTE FUNCTION v3.reject_evidence_update();
CREATE TRIGGER policy_immutable BEFORE UPDATE OR DELETE ON v3.policy FOR EACH ROW EXECUTE FUNCTION v3.reject_evidence_update();
CREATE TRIGGER metric_definition_immutable BEFORE UPDATE OR DELETE ON v3.metric_definition FOR EACH ROW EXECUTE FUNCTION v3.reject_evidence_update();
CREATE FUNCTION v3.protect_projection() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM v3.publication WHERE id=COALESCE(NEW.publication_id,OLD.publication_id) AND state='published') THEN RAISE EXCEPTION 'Published results are immutable'; END IF;
 RETURN COALESCE(NEW,OLD); END $$;
CREATE TRIGGER metric_immutable BEFORE INSERT OR UPDATE OR DELETE ON v3.metric_projection FOR EACH ROW EXECUTE FUNCTION v3.protect_projection();
CREATE TRIGGER group_immutable BEFORE INSERT OR UPDATE OR DELETE ON v3.group_projection FOR EACH ROW EXECUTE FUNCTION v3.protect_projection();
CREATE TRIGGER consumption_immutable BEFORE INSERT OR UPDATE OR DELETE ON v3.consumption_projection FOR EACH ROW EXECUTE FUNCTION v3.protect_projection();
CREATE FUNCTION v3.protect_publication() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
 IF OLD.state='published' THEN RAISE EXCEPTION 'Published manifest is immutable'; END IF; RETURN NEW; END $$;
CREATE TRIGGER publication_immutable BEFORE UPDATE OR DELETE ON v3.publication FOR EACH ROW EXECUTE FUNCTION v3.protect_publication();

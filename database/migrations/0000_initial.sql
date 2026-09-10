CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"subject_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"outcome" text NOT NULL,
	"correlation_id" text NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_events_outcome_chk" CHECK ("audit_events"."outcome" in ('success','denied','failed'))
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"badge_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"color_name" text NOT NULL,
	"color_code" text NOT NULL,
	"rule_version" integer NOT NULL,
	"rule_definition" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "badges_badge_key_unique" UNIQUE("badge_key"),
	CONSTRAINT "badges_rule_version_chk" CHECK ("badges"."rule_version" > 0)
);
--> statement-breakpoint
CREATE TABLE "course_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"percentage" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'not_started' NOT NULL,
	"source" text NOT NULL,
	"evidence_metadata" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "course_progress_percentage_chk" CHECK ("course_progress"."percentage" between 0 and 100),
	CONSTRAINT "course_progress_status_chk" CHECK ("course_progress"."status" in ('not_started','in_progress','completed')),
	CONSTRAINT "course_progress_source_chk" CHECK ("course_progress"."source" in ('provider','manual')),
	CONSTRAINT "course_progress_version_chk" CHECK ("course_progress"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_key" text NOT NULL,
	"title" text NOT NULL,
	"provider" text NOT NULL,
	"provider_course_id" text,
	"provider_url" text,
	"duration_minutes" integer NOT NULL,
	"eligibility" text DEFAULT 'all' NOT NULL,
	"manual_progress_allowed" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_course_key_unique" UNIQUE("course_key"),
	CONSTRAINT "courses_duration_chk" CHECK ("courses"."duration_minutes" > 0),
	CONSTRAINT "courses_eligibility_chk" CHECK ("courses"."eligibility" in ('all','employee','contractor'))
);
--> statement-breakpoint
CREATE TABLE "external_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"tenant_id" text DEFAULT '' NOT NULL,
	"mapping_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "external_identities_status_chk" CHECK ("external_identities"."mapping_status" in ('confirmed','pending','quarantined','disabled'))
);
--> statement-breakpoint
CREATE TABLE "idempotency_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_id" text NOT NULL,
	"operation_type" text NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" integer NOT NULL,
	"response_body" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "integration_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector" text NOT NULL,
	"direction" text NOT NULL,
	"logical_run_key" text NOT NULL,
	"status" text NOT NULL,
	"checkpoint" text,
	"expected_count" integer,
	"actual_count" integer,
	"expected_checksum" text,
	"actual_checksum" text,
	"data_state" text NOT NULL,
	"error_summary" jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"data_through" timestamp with time zone,
	CONSTRAINT "integration_runs_logical_run_key_unique" UNIQUE("logical_run_key"),
	CONSTRAINT "integration_runs_direction_chk" CHECK ("integration_runs"."direction" in ('import','export')),
	CONSTRAINT "integration_runs_status_chk" CHECK ("integration_runs"."status" in ('queued','running','succeeded','partial','failed')),
	CONSTRAINT "integration_runs_data_state_chk" CHECK ("integration_runs"."data_state" in ('current','stale','partial','unavailable')),
	CONSTRAINT "integration_runs_counts_chk" CHECK (("integration_runs"."expected_count" is null or "integration_runs"."expected_count" >= 0) and ("integration_runs"."actual_count" is null or "integration_runs"."actual_count" >= 0))
);
--> statement-breakpoint
CREATE TABLE "knowledge_check_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_check_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"submitted_answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"passed" boolean NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_check_attempts_number_chk" CHECK ("knowledge_check_attempts"."attempt_number" > 0),
	CONSTRAINT "knowledge_check_attempts_score_chk" CHECK ("knowledge_check_attempts"."score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "knowledge_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"title" text NOT NULL,
	"version_number" integer NOT NULL,
	"passing_score" integer NOT NULL,
	"questions" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "knowledge_checks_version_chk" CHECK ("knowledge_checks"."version_number" > 0),
	CONSTRAINT "knowledge_checks_score_chk" CHECK ("knowledge_checks"."passing_score" between 0 and 100)
);
--> statement-breakpoint
CREATE TABLE "learning_path_courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learning_path_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"sequence_number" integer NOT NULL,
	"stage" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "learning_path_courses_sequence_chk" CHECK ("learning_path_courses"."sequence_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_key" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"version_number" integer NOT NULL,
	"target_role" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"effective_to" timestamp with time zone,
	CONSTRAINT "learning_paths_version_chk" CHECK ("learning_paths"."version_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"integration_run_id" uuid,
	"aggregate_type" text NOT NULL,
	"aggregate_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"contract_version" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"exported_at" timestamp with time zone,
	CONSTRAINT "outbox_events_status_chk" CHECK ("outbox_events"."status" in ('pending','processing','exported','failed')),
	CONSTRAINT "outbox_events_attempt_count_chk" CHECK ("outbox_events"."attempt_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"entry_type" text NOT NULL,
	"points" integer NOT NULL,
	"reason_code" text NOT NULL,
	"award_key" text NOT NULL,
	"evidence_type" text NOT NULL,
	"evidence_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "point_ledger_award_key_unique" UNIQUE("award_key"),
	CONSTRAINT "point_ledger_type_chk" CHECK ("point_ledger"."entry_type" in ('award','reversal','correction')),
	CONSTRAINT "point_ledger_points_chk" CHECK ("point_ledger"."points" <> 0)
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"award_key" text NOT NULL,
	"evidence" jsonb NOT NULL,
	"awarded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	CONSTRAINT "user_badges_award_key_unique" UNIQUE("award_key"),
	CONSTRAINT "user_badges_status_chk" CHECK ("user_badges"."status" in ('active','reversed'))
);
--> statement-breakpoint
CREATE TABLE "user_certifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"certification_key" text NOT NULL,
	"certification_name" text NOT NULL,
	"issuer" text NOT NULL,
	"credential_id" text,
	"verification_url" text,
	"verification_status" text DEFAULT 'pending' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	CONSTRAINT "user_certifications_status_chk" CHECK ("user_certifications"."verification_status" in ('pending','verified','rejected','expired'))
);
--> statement-breakpoint
CREATE TABLE "user_path_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"learning_path_id" uuid NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"assignment_reason" text NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "user_path_assignments_status_chk" CHECK ("user_path_assignments"."status" in ('active','completed','superseded','cancelled'))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"person_number" text,
	"employment_type" text,
	"job_role" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"profile_status" text DEFAULT 'pending_profile' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"entitled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "users_person_number_unique" UNIQUE("person_number"),
	CONSTRAINT "users_employment_type_chk" CHECK ("users"."employment_type" is null or "users"."employment_type" in ('employee','contractor')),
	CONSTRAINT "users_profile_status_chk" CHECK ("users"."profile_status" in ('active','pending_profile','inactive')),
	CONSTRAINT "users_version_chk" CHECK ("users"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "weekly_activity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"qualifying_days" integer NOT NULL,
	"request_count" integer NOT NULL,
	"input_tokens" bigint,
	"output_tokens" bigint,
	"estimated_cost" numeric(14, 4),
	"tool_mix" jsonb NOT NULL,
	"source" text NOT NULL,
	"data_state" text NOT NULL,
	"data_through" timestamp with time zone NOT NULL,
	CONSTRAINT "weekly_activity_days_chk" CHECK ("weekly_activity"."qualifying_days" between 0 and 7),
	CONSTRAINT "weekly_activity_request_count_chk" CHECK ("weekly_activity"."request_count" >= 0),
	CONSTRAINT "weekly_activity_data_state_chk" CHECK ("weekly_activity"."data_state" in ('current','stale','partial','unavailable'))
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_subject_user_id_users_id_fk" FOREIGN KEY ("subject_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_progress" ADD CONSTRAINT "course_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_check_attempts" ADD CONSTRAINT "knowledge_check_attempts_knowledge_check_id_knowledge_checks_id_fk" FOREIGN KEY ("knowledge_check_id") REFERENCES "public"."knowledge_checks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_check_attempts" ADD CONSTRAINT "knowledge_check_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_checks" ADD CONSTRAINT "knowledge_checks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_path_courses" ADD CONSTRAINT "learning_path_courses_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_integration_run_id_integration_runs_id_fk" FOREIGN KEY ("integration_run_id") REFERENCES "public"."integration_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "point_ledger" ADD CONSTRAINT "point_ledger_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_path_assignments" ADD CONSTRAINT "user_path_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_path_assignments" ADD CONSTRAINT "user_path_assignments_learning_path_id_learning_paths_id_fk" FOREIGN KEY ("learning_path_id") REFERENCES "public"."learning_paths"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weekly_activity" ADD CONSTRAINT "weekly_activity_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_subject_date_idx" ON "audit_events" USING btree ("subject_user_id","occurred_at");--> statement-breakpoint
CREATE INDEX "audit_events_correlation_idx" ON "audit_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_progress_user_course_uidx" ON "course_progress" USING btree ("user_id","course_id");--> statement-breakpoint
CREATE INDEX "course_progress_user_status_idx" ON "course_progress" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "courses_provider_id_uidx" ON "courses" USING btree ("provider","provider_course_id") WHERE "courses"."provider_course_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "external_identities_source_uidx" ON "external_identities" USING btree ("provider","tenant_id","external_id");--> statement-breakpoint
CREATE INDEX "external_identities_user_provider_idx" ON "external_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "idempotency_records_user_operation_uidx" ON "idempotency_records" USING btree ("user_id","operation_id");--> statement-breakpoint
CREATE INDEX "integration_runs_connector_date_idx" ON "integration_runs" USING btree ("connector","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_check_attempts_check_user_number_uidx" ON "knowledge_check_attempts" USING btree ("knowledge_check_id","user_id","attempt_number");--> statement-breakpoint
CREATE INDEX "knowledge_check_attempts_user_date_idx" ON "knowledge_check_attempts" USING btree ("user_id","submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_checks_course_version_uidx" ON "knowledge_checks" USING btree ("course_id","version_number");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_path_courses_path_course_uidx" ON "learning_path_courses" USING btree ("learning_path_id","course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_path_courses_path_sequence_uidx" ON "learning_path_courses" USING btree ("learning_path_id","sequence_number");--> statement-breakpoint
CREATE UNIQUE INDEX "learning_paths_key_version_uidx" ON "learning_paths" USING btree ("path_key","version_number");--> statement-breakpoint
CREATE INDEX "learning_paths_active_idx" ON "learning_paths" USING btree ("path_key","active");--> statement-breakpoint
CREATE INDEX "outbox_events_status_date_idx" ON "outbox_events" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "point_ledger_user_date_idx" ON "point_ledger" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_active_name_uidx" ON "teams" USING btree ("name") WHERE "teams"."active" = true;--> statement-breakpoint
CREATE INDEX "user_badges_user_status_idx" ON "user_badges" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "user_certifications_issuer_credential_uidx" ON "user_certifications" USING btree ("issuer","credential_id") WHERE "user_certifications"."credential_id" is not null;--> statement-breakpoint
CREATE INDEX "user_certifications_user_status_idx" ON "user_certifications" USING btree ("user_id","verification_status");--> statement-breakpoint
CREATE INDEX "user_path_assignments_user_status_idx" ON "user_path_assignments" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "users_team_active_idx" ON "users" USING btree ("team_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "weekly_activity_user_week_uidx" ON "weekly_activity" USING btree ("user_id","week_start");--> statement-breakpoint
CREATE INDEX "weekly_activity_user_week_idx" ON "weekly_activity" USING btree ("user_id","week_start");
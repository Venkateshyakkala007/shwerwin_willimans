import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = timestamp('created_at', { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp('updated_at', { withTimezone: true })
  .notNull()
  .defaultNow();

export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    active: boolean('active').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('teams_active_name_uidx')
      .on(table.name)
      .where(sql`${table.active} = true`),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').references(() => teams.id, {
      onDelete: 'restrict',
    }),
    displayName: text('display_name').notNull(),
    email: text('email').notNull(),
    personNumber: text('person_number').unique(),
    employmentType: text('employment_type'),
    jobRole: text('job_role'),
    timezone: text('timezone').notNull().default('UTC'),
    profileStatus: text('profile_status').notNull().default('pending_profile'),
    active: boolean('active').notNull().default(true),
    entitled: boolean('entitled').notNull().default(false),
    createdAt,
    updatedAt,
    version: integer('version').notNull().default(1),
  },
  (table) => [
    index('users_team_active_idx').on(table.teamId, table.active),
    check(
      'users_employment_type_chk',
      sql`${table.employmentType} is null or ${table.employmentType} in ('employee','contractor')`,
    ),
    check(
      'users_profile_status_chk',
      sql`${table.profileStatus} in ('active','pending_profile','inactive')`,
    ),
    check('users_version_chk', sql`${table.version} > 0`),
  ],
);

export const externalIdentities = pgTable(
  'external_identities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    tenantId: text('tenant_id').notNull().default(''),
    mappingStatus: text('mapping_status').notNull().default('pending'),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('external_identities_source_uidx').on(
      table.provider,
      table.tenantId,
      table.externalId,
    ),
    index('external_identities_user_provider_idx').on(
      table.userId,
      table.provider,
    ),
    check(
      'external_identities_status_chk',
      sql`${table.mappingStatus} in ('confirmed','pending','quarantined','disabled')`,
    ),
  ],
);

export const learningPaths = pgTable(
  'learning_paths',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pathKey: text('path_key').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    versionNumber: integer('version_number').notNull(),
    targetRole: text('target_role').notNull(),
    active: boolean('active').notNull().default(true),
    effectiveFrom: timestamp('effective_from', {
      withTimezone: true,
    }).notNull(),
    effectiveTo: timestamp('effective_to', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('learning_paths_key_version_uidx').on(
      table.pathKey,
      table.versionNumber,
    ),
    index('learning_paths_active_idx').on(table.pathKey, table.active),
    check('learning_paths_version_chk', sql`${table.versionNumber} > 0`),
  ],
);

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseKey: text('course_key').notNull().unique(),
    title: text('title').notNull(),
    provider: text('provider').notNull(),
    providerCourseId: text('provider_course_id'),
    providerUrl: text('provider_url'),
    durationMinutes: integer('duration_minutes').notNull(),
    eligibility: text('eligibility').notNull().default('all'),
    manualProgressAllowed: boolean('manual_progress_allowed')
      .notNull()
      .default(false),
    active: boolean('active').notNull().default(true),
    createdAt,
    updatedAt,
  },
  (table) => [
    uniqueIndex('courses_provider_id_uidx')
      .on(table.provider, table.providerCourseId)
      .where(sql`${table.providerCourseId} is not null`),
    check('courses_duration_chk', sql`${table.durationMinutes} > 0`),
    check(
      'courses_eligibility_chk',
      sql`${table.eligibility} in ('all','employee','contractor')`,
    ),
  ],
);

export const learningPathCourses = pgTable(
  'learning_path_courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learningPathId: uuid('learning_path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'restrict' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    sequenceNumber: integer('sequence_number').notNull(),
    stage: text('stage').notNull(),
    required: boolean('required').notNull().default(true),
  },
  (table) => [
    uniqueIndex('learning_path_courses_path_course_uidx').on(
      table.learningPathId,
      table.courseId,
    ),
    uniqueIndex('learning_path_courses_path_sequence_uidx').on(
      table.learningPathId,
      table.sequenceNumber,
    ),
    check(
      'learning_path_courses_sequence_chk',
      sql`${table.sequenceNumber} > 0`,
    ),
  ],
);

export const userPathAssignments = pgTable(
  'user_path_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    learningPathId: uuid('learning_path_id')
      .notNull()
      .references(() => learningPaths.id, { onDelete: 'restrict' }),
    status: text('status').notNull().default('active'),
    assignmentReason: text('assignment_reason').notNull(),
    assignedAt: timestamp('assigned_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => [
    index('user_path_assignments_user_status_idx').on(
      table.userId,
      table.status,
    ),
    check(
      'user_path_assignments_status_chk',
      sql`${table.status} in ('active','completed','superseded','cancelled')`,
    ),
  ],
);

export const courseProgress = pgTable(
  'course_progress',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    percentage: integer('percentage').notNull().default(0),
    status: text('status').notNull().default('not_started'),
    source: text('source').notNull(),
    evidenceMetadata:
      jsonb('evidence_metadata').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt,
    version: integer('version').notNull().default(1),
  },
  (table) => [
    uniqueIndex('course_progress_user_course_uidx').on(
      table.userId,
      table.courseId,
    ),
    index('course_progress_user_status_idx').on(table.userId, table.status),
    check(
      'course_progress_percentage_chk',
      sql`${table.percentage} between 0 and 100`,
    ),
    check(
      'course_progress_status_chk',
      sql`${table.status} in ('not_started','in_progress','completed')`,
    ),
    check(
      'course_progress_source_chk',
      sql`${table.source} in ('provider','manual')`,
    ),
    check('course_progress_version_chk', sql`${table.version} > 0`),
  ],
);

export const knowledgeChecks = pgTable(
  'knowledge_checks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    versionNumber: integer('version_number').notNull(),
    passingScore: integer('passing_score').notNull(),
    questions: jsonb('questions')
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    active: boolean('active').notNull().default(true),
  },
  (table) => [
    uniqueIndex('knowledge_checks_course_version_uidx').on(
      table.courseId,
      table.versionNumber,
    ),
    check('knowledge_checks_version_chk', sql`${table.versionNumber} > 0`),
    check(
      'knowledge_checks_score_chk',
      sql`${table.passingScore} between 0 and 100`,
    ),
  ],
);

export const knowledgeCheckAttempts = pgTable(
  'knowledge_check_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    knowledgeCheckId: uuid('knowledge_check_id')
      .notNull()
      .references(() => knowledgeChecks.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    attemptNumber: integer('attempt_number').notNull(),
    submittedAnswers: jsonb('submitted_answers')
      .$type<Array<Record<string, unknown>>>()
      .notNull(),
    score: integer('score').notNull(),
    passed: boolean('passed').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('knowledge_check_attempts_check_user_number_uidx').on(
      table.knowledgeCheckId,
      table.userId,
      table.attemptNumber,
    ),
    index('knowledge_check_attempts_user_date_idx').on(
      table.userId,
      table.submittedAt,
    ),
    check(
      'knowledge_check_attempts_number_chk',
      sql`${table.attemptNumber} > 0`,
    ),
    check(
      'knowledge_check_attempts_score_chk',
      sql`${table.score} between 0 and 100`,
    ),
  ],
);

export const badges = pgTable(
  'badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    badgeKey: text('badge_key').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    colorName: text('color_name').notNull(),
    colorCode: text('color_code').notNull(),
    ruleVersion: integer('rule_version').notNull(),
    ruleDefinition: jsonb('rule_definition')
      .$type<Record<string, unknown>>()
      .notNull(),
    active: boolean('active').notNull().default(true),
  },
  (table) => [check('badges_rule_version_chk', sql`${table.ruleVersion} > 0`)],
);

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'restrict' }),
    awardKey: text('award_key').notNull().unique(),
    evidence: jsonb('evidence').$type<Record<string, unknown>>().notNull(),
    awardedAt: timestamp('awarded_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: text('status').notNull().default('active'),
  },
  (table) => [
    index('user_badges_user_status_idx').on(table.userId, table.status),
    check(
      'user_badges_status_chk',
      sql`${table.status} in ('active','reversed')`,
    ),
  ],
);

export const pointLedger = pgTable(
  'point_ledger',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    entryType: text('entry_type').notNull(),
    points: integer('points').notNull(),
    reasonCode: text('reason_code').notNull(),
    awardKey: text('award_key').notNull().unique(),
    evidenceType: text('evidence_type').notNull(),
    evidenceId: uuid('evidence_id').notNull(),
    createdAt,
  },
  (table) => [
    index('point_ledger_user_date_idx').on(table.userId, table.createdAt),
    check(
      'point_ledger_type_chk',
      sql`${table.entryType} in ('award','reversal','correction')`,
    ),
    check('point_ledger_points_chk', sql`${table.points} <> 0`),
  ],
);

export const userCertifications = pgTable(
  'user_certifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    certificationKey: text('certification_key').notNull(),
    certificationName: text('certification_name').notNull(),
    issuer: text('issuer').notNull(),
    credentialId: text('credential_id'),
    verificationUrl: text('verification_url'),
    verificationStatus: text('verification_status')
      .notNull()
      .default('pending'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('user_certifications_issuer_credential_uidx')
      .on(table.issuer, table.credentialId)
      .where(sql`${table.credentialId} is not null`),
    index('user_certifications_user_status_idx').on(
      table.userId,
      table.verificationStatus,
    ),
    check(
      'user_certifications_status_chk',
      sql`${table.verificationStatus} in ('pending','verified','rejected','expired')`,
    ),
  ],
);

export const weeklyActivity = pgTable(
  'weekly_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    weekStart: date('week_start').notNull(),
    qualifyingDays: integer('qualifying_days').notNull(),
    requestCount: integer('request_count').notNull(),
    inputTokens: bigint('input_tokens', { mode: 'number' }),
    outputTokens: bigint('output_tokens', { mode: 'number' }),
    estimatedCost: numeric('estimated_cost', { precision: 14, scale: 4 }),
    toolMix: jsonb('tool_mix')
      .$type<
        Array<{ tool: string; percentage: number; qualifyingDays: number }>
      >()
      .notNull(),
    source: text('source').notNull(),
    dataState: text('data_state').notNull(),
    dataThrough: timestamp('data_through', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('weekly_activity_user_week_uidx').on(
      table.userId,
      table.weekStart,
    ),
    index('weekly_activity_user_week_idx').on(table.userId, table.weekStart),
    check(
      'weekly_activity_days_chk',
      sql`${table.qualifyingDays} between 0 and 7`,
    ),
    check('weekly_activity_request_count_chk', sql`${table.requestCount} >= 0`),
    check(
      'weekly_activity_data_state_chk',
      sql`${table.dataState} in ('current','stale','partial','unavailable')`,
    ),
  ],
);

export const idempotencyRecords = pgTable(
  'idempotency_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    operationId: text('operation_id').notNull(),
    operationType: text('operation_type').notNull(),
    requestHash: text('request_hash').notNull(),
    responseStatus: integer('response_status').notNull(),
    responseBody: jsonb('response_body')
      .$type<Record<string, unknown>>()
      .notNull(),
    createdAt,
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('idempotency_records_user_operation_uidx').on(
      table.userId,
      table.operationId,
    ),
  ],
);

export const auditEvents = pgTable(
  'audit_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    subjectUserId: uuid('subject_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: uuid('resource_id'),
    outcome: text('outcome').notNull(),
    correlationId: text('correlation_id').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    occurredAt: timestamp('occurred_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_events_subject_date_idx').on(
      table.subjectUserId,
      table.occurredAt,
    ),
    index('audit_events_correlation_idx').on(table.correlationId),
    check(
      'audit_events_outcome_chk',
      sql`${table.outcome} in ('success','denied','failed')`,
    ),
  ],
);

export const integrationRuns = pgTable(
  'integration_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connector: text('connector').notNull(),
    direction: text('direction').notNull(),
    logicalRunKey: text('logical_run_key').notNull().unique(),
    status: text('status').notNull(),
    checkpoint: text('checkpoint'),
    expectedCount: integer('expected_count'),
    actualCount: integer('actual_count'),
    expectedChecksum: text('expected_checksum'),
    actualChecksum: text('actual_checksum'),
    dataState: text('data_state').notNull(),
    errorSummary: jsonb('error_summary').$type<Record<string, unknown>>(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    dataThrough: timestamp('data_through', { withTimezone: true }),
  },
  (table) => [
    index('integration_runs_connector_date_idx').on(
      table.connector,
      table.startedAt,
    ),
    check(
      'integration_runs_direction_chk',
      sql`${table.direction} in ('import','export')`,
    ),
    check(
      'integration_runs_status_chk',
      sql`${table.status} in ('queued','running','succeeded','partial','failed')`,
    ),
    check(
      'integration_runs_data_state_chk',
      sql`${table.dataState} in ('current','stale','partial','unavailable')`,
    ),
    check(
      'integration_runs_counts_chk',
      sql`(${table.expectedCount} is null or ${table.expectedCount} >= 0) and (${table.actualCount} is null or ${table.actualCount} >= 0)`,
    ),
  ],
);

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'restrict',
    }),
    integrationRunId: uuid('integration_run_id').references(
      () => integrationRuns.id,
      { onDelete: 'restrict' },
    ),
    aggregateType: text('aggregate_type').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    contractVersion: text('contract_version').notNull(),
    status: text('status').notNull().default('pending'),
    attemptCount: integer('attempt_count').notNull().default(0),
    createdAt,
    exportedAt: timestamp('exported_at', { withTimezone: true }),
  },
  (table) => [
    index('outbox_events_status_date_idx').on(table.status, table.createdAt),
    check(
      'outbox_events_status_chk',
      sql`${table.status} in ('pending','processing','exported','failed')`,
    ),
    check('outbox_events_attempt_count_chk', sql`${table.attemptCount} >= 0`),
  ],
);

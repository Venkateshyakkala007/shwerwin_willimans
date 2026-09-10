import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type {
  DashboardCourse,
  DashboardLearningPath,
  DashboardSnapshot,
  DataState,
  ExternalIdentity,
  ProgressRecord,
  ProgressStatus,
  ToolUsage,
  UserProfile,
} from '../../../packages/contracts/src/index';
import { pool } from './db';

type Queryable = Pick<PoolClient, 'query'>;

const iso = (value: Date | string | null): string | null =>
  value === null
    ? null
    : value instanceof Date
      ? value.toISOString()
      : new Date(value).toISOString();

export class ApiProblem extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function findUser(
  queryable: Queryable,
  userId: string,
): Promise<UserProfile> {
  const result = await queryable.query<{
    id: string;
    displayName: string;
    email: string;
    jobRole: string | null;
    team: string | null;
    employmentType: UserProfile['employmentType'];
    timezone: string;
    profileStatus: UserProfile['profileStatus'];
    active: boolean;
    entitled: boolean;
  }>(
    `SELECT u.id, u.display_name AS "displayName", u.email,
            u.job_role AS "jobRole", t.name AS team,
            u.employment_type AS "employmentType", u.timezone,
            u.profile_status AS "profileStatus", u.active, u.entitled
       FROM users u
       LEFT JOIN teams t ON t.id = u.team_id
      WHERE u.id = $1`,
    [userId],
  );
  if (!result.rows[0])
    throw new ApiProblem(
      404,
      'USER_NOT_FOUND',
      'The requested user does not exist.',
    );
  return result.rows[0];
}

export async function getUser(userId: string): Promise<UserProfile> {
  const user = await findUser(pool, userId);
  const result = await pool.query<ExternalIdentity>(
    `SELECT provider, external_id AS "externalId", tenant_id AS "tenantId",
            mapping_status AS "mappingStatus"
       FROM external_identities
      WHERE user_id = $1
      ORDER BY provider`,
    [userId],
  );
  return { ...user, identities: result.rows };
}

export async function getCourses(userId: string): Promise<DashboardCourse[]> {
  const user = await findUser(pool, userId);
  const result = await pool.query<{
    id: string;
    courseKey: string;
    title: string;
    provider: string;
    providerUrl: string | null;
    durationMinutes: number;
    manualProgressAllowed: boolean;
    required: boolean;
    sequenceNumber: number;
    stage: string;
    progressId: string | null;
    percentage: number;
    status: ProgressStatus;
    source: ProgressRecord['source'];
    version: number;
    updatedAt: Date | null;
  }>(
    `SELECT c.id, c.course_key AS "courseKey", c.title, c.provider,
            c.provider_url AS "providerUrl", c.duration_minutes AS "durationMinutes",
            c.manual_progress_allowed AS "manualProgressAllowed", lpc.required,
            lpc.sequence_number AS "sequenceNumber", lpc.stage,
            cp.id AS "progressId", COALESCE(cp.percentage, 0)::int AS percentage,
            COALESCE(cp.status, 'not_started') AS status,
            COALESCE(cp.source, 'manual') AS source,
            COALESCE(cp.version, 0)::int AS version, cp.updated_at AS "updatedAt"
       FROM user_path_assignments upa
       JOIN learning_paths lp ON lp.id = upa.learning_path_id AND lp.active = true
       JOIN learning_path_courses lpc ON lpc.learning_path_id = lp.id
       JOIN courses c ON c.id = lpc.course_id AND c.active = true
       LEFT JOIN course_progress cp ON cp.course_id = c.id AND cp.user_id = upa.user_id
      WHERE upa.user_id = $1 AND upa.status = 'active'
        AND (c.eligibility = 'all' OR c.eligibility = $2)
      ORDER BY lp.path_key, lpc.sequence_number`,
    [userId, user.employmentType],
  );
  return result.rows.map((row) => ({
    id: row.id,
    courseKey: row.courseKey,
    title: row.title,
    provider: row.provider,
    providerUrl: row.providerUrl,
    durationMinutes: row.durationMinutes,
    manualProgressAllowed: row.manualProgressAllowed,
    required: row.required,
    sequenceNumber: row.sequenceNumber,
    stage: row.stage,
    progress: {
      id: row.progressId ?? `unstarted:${row.id}`,
      courseId: row.id,
      percentage: row.percentage,
      status: row.status,
      source: row.source,
      version: row.version,
      updatedAt: iso(row.updatedAt) ?? new Date(0).toISOString(),
    },
  }));
}

export async function getDashboard(userId: string): Promise<DashboardSnapshot> {
  const user = await findUser(pool, userId);
  const [
    pathRows,
    activityRows,
    badgeRows,
    certificationRows,
    knowledgeRows,
    pointRows,
    cohortRows,
  ] = await Promise.all([
    pool.query<{
      pathId: string;
      pathKey: string;
      pathName: string;
      pathDescription: string;
      versionNumber: number;
      assignmentStatus: string;
      courseId: string;
      courseKey: string;
      title: string;
      provider: string;
      providerUrl: string | null;
      durationMinutes: number;
      manualProgressAllowed: boolean;
      required: boolean;
      sequenceNumber: number;
      stage: string;
      progressId: string | null;
      percentage: number;
      progressStatus: ProgressStatus;
      progressSource: ProgressRecord['source'];
      progressVersion: number;
      progressUpdatedAt: Date | null;
    }>(
      `SELECT lp.id AS "pathId", lp.path_key AS "pathKey", lp.name AS "pathName",
                lp.description AS "pathDescription", lp.version_number AS "versionNumber",
                upa.status AS "assignmentStatus", c.id AS "courseId",
                c.course_key AS "courseKey", c.title, c.provider,
                c.provider_url AS "providerUrl", c.duration_minutes AS "durationMinutes",
                c.manual_progress_allowed AS "manualProgressAllowed", lpc.required,
                lpc.sequence_number AS "sequenceNumber", lpc.stage,
                cp.id AS "progressId", COALESCE(cp.percentage, 0)::int AS percentage,
                COALESCE(cp.status, 'not_started') AS "progressStatus",
                COALESCE(cp.source, 'manual') AS "progressSource",
                COALESCE(cp.version, 0)::int AS "progressVersion",
                cp.updated_at AS "progressUpdatedAt"
           FROM user_path_assignments upa
           JOIN learning_paths lp ON lp.id = upa.learning_path_id AND lp.active = true
           JOIN learning_path_courses lpc ON lpc.learning_path_id = lp.id
           JOIN courses c ON c.id = lpc.course_id AND c.active = true
           LEFT JOIN course_progress cp ON cp.course_id = c.id AND cp.user_id = upa.user_id
          WHERE upa.user_id = $1 AND upa.status IN ('active', 'completed')
            AND (c.eligibility = 'all' OR c.eligibility = $2)
          ORDER BY CASE WHEN lp.path_key = 'individual-contributor' THEN 0 ELSE 1 END,
                   lp.name, lpc.sequence_number`,
      [userId, user.employmentType],
    ),
    pool.query<{
      weekStart: string;
      qualifyingDays: number;
      requestCount: number;
      dataState: DataState;
      dataThrough: Date;
      toolMix: ToolUsage[];
    }>(
      `SELECT week_start::text AS "weekStart", qualifying_days AS "qualifyingDays",
                request_count AS "requestCount", data_state AS "dataState",
                data_through AS "dataThrough", tool_mix AS "toolMix"
           FROM (
             SELECT * FROM weekly_activity WHERE user_id = $1 ORDER BY week_start DESC LIMIT 12
           ) recent
          ORDER BY week_start`,
      [userId],
    ),
    pool.query<{
      id: string;
      badgeKey: string;
      name: string;
      description: string;
      colorName: string;
      colorCode: string;
      awardedAt: Date | null;
    }>(
      `SELECT b.id, b.badge_key AS "badgeKey", b.name, b.description,
                b.color_name AS "colorName", b.color_code AS "colorCode",
                ub.awarded_at AS "awardedAt"
           FROM badges b
           LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = $1 AND ub.status = 'active'
          WHERE b.active = true
          ORDER BY CASE b.badge_key
                     WHEN 'primer' THEN 1 WHEN 'first-coat' THEN 2 WHEN 'cut-in' THEN 3
                     WHEN 'second-coat' THEN 4 WHEN 'emerald' THEN 5 ELSE 6 END`,
      [userId],
    ),
    pool.query<{
      id: string;
      certificationKey: string;
      certificationName: string;
      issuer: string;
      verificationStatus: string;
      verificationUrl: string | null;
      issuedAt: Date;
    }>(
      `SELECT id, certification_key AS "certificationKey",
                certification_name AS "certificationName", issuer,
                verification_status AS "verificationStatus",
                verification_url AS "verificationUrl", issued_at AS "issuedAt"
           FROM user_certifications
          WHERE user_id = $1
          ORDER BY issued_at DESC`,
      [userId],
    ),
    pool.query<{
      title: string;
      score: number;
      passed: boolean;
      submittedAt: Date;
    }>(
      `SELECT kc.title, kca.score, kca.passed, kca.submitted_at AS "submittedAt"
           FROM knowledge_check_attempts kca
           JOIN knowledge_checks kc ON kc.id = kca.knowledge_check_id
          WHERE kca.user_id = $1
          ORDER BY kca.submitted_at DESC LIMIT 1`,
      [userId],
    ),
    pool.query<{ points: number }>(
      `SELECT COALESCE(SUM(points), 0)::int AS points FROM point_ledger WHERE user_id = $1`,
      [userId],
    ),
    pool.query<{ cohortSize: number }>(
      `SELECT COUNT(*)::int AS "cohortSize" FROM users WHERE team_id = (
           SELECT team_id FROM users WHERE id = $1
         ) AND active = true AND entitled = true`,
      [userId],
    ),
  ]);

  const pathMap = new Map<string, DashboardLearningPath>();
  for (const row of pathRows.rows) {
    let path = pathMap.get(row.pathId);
    if (!path) {
      path = {
        id: row.pathId,
        pathKey: row.pathKey,
        name: row.pathName,
        description: row.pathDescription,
        versionNumber: row.versionNumber,
        assignmentStatus: row.assignmentStatus,
        courses: [],
      };
      pathMap.set(row.pathId, path);
    }
    path.courses.push({
      id: row.courseId,
      courseKey: row.courseKey,
      title: row.title,
      provider: row.provider,
      providerUrl: row.providerUrl,
      durationMinutes: row.durationMinutes,
      manualProgressAllowed: row.manualProgressAllowed,
      required: row.required,
      sequenceNumber: row.sequenceNumber,
      stage: row.stage,
      progress: {
        id: row.progressId ?? `unstarted:${row.courseId}`,
        courseId: row.courseId,
        percentage: row.percentage,
        status: row.progressStatus,
        source: row.progressSource,
        version: row.progressVersion,
        updatedAt: iso(row.progressUpdatedAt) ?? new Date(0).toISOString(),
      },
    });
  }

  const paths = [...pathMap.values()];
  const requiredCourses = paths
    .flatMap((path) => path.courses)
    .filter((course) => course.required);
  const allCourses = paths.flatMap((path) => path.courses);
  const completedRequired = requiredCourses.filter(
    (course) => course.progress.status === 'completed',
  ).length;
  const completedCourses = allCourses.filter(
    (course) => course.progress.status === 'completed',
  ).length;
  const weeksActive = activityRows.rows.filter(
    (week) => week.qualifyingDays >= 2,
  ).length;
  const badgesEarned = badgeRows.rows.filter(
    (badge) => badge.awardedAt !== null,
  ).length;
  const latestActivity = activityRows.rows.at(-1);
  const minimumCohortSize = 5;
  const cohortSize = cohortRows.rows[0]?.cohortSize ?? 0;

  return {
    user,
    metrics: {
      trained:
        requiredCourses.length === 0
          ? 0
          : Math.round((completedRequired / requiredCourses.length) * 100),
      adopted:
        activityRows.rows.length === 0
          ? 0
          : Math.round((weeksActive / activityRows.rows.length) * 100),
      points: pointRows.rows[0]?.points ?? 0,
      badgesEarned,
      badgesTotal: badgeRows.rows.length,
      weeksActive,
      weeksTotal: activityRows.rows.length,
      coursesCompleted: completedCourses,
      coursesTotal: allCourses.length,
      certifications: certificationRows.rows.filter(
        (item) => item.verificationStatus === 'verified',
      ).length,
    },
    activity: activityRows.rows.map((week) => ({
      weekStart: week.weekStart,
      qualifyingDays: week.qualifyingDays,
      requestCount: week.requestCount,
      dataState: week.dataState,
    })),
    tools: latestActivity?.toolMix ?? [],
    badges: badgeRows.rows.map((badge, index) => ({
      ...badge,
      state: badge.awardedAt
        ? 'earned'
        : index === badgesEarned
          ? 'in_progress'
          : 'locked',
      awardedAt: iso(badge.awardedAt),
    })),
    paths,
    certifications: certificationRows.rows.map((certification) => ({
      ...certification,
      issuedAt: iso(certification.issuedAt)!,
    })),
    knowledgeCheck: knowledgeRows.rows[0]
      ? {
          ...knowledgeRows.rows[0],
          submittedAt: iso(knowledgeRows.rows[0].submittedAt)!,
        }
      : null,
    freshness: {
      state: latestActivity?.dataState ?? 'unavailable',
      dataThrough: iso(latestActivity?.dataThrough ?? null),
    },
    benchmark: {
      publishable: cohortSize >= minimumCohortSize,
      cohortSize,
      minimumCohortSize,
    },
  };
}

export interface ProgressUpdateInput {
  courseId: string;
  percentage: number;
  expectedVersion: number;
}

export async function updateProgress(
  userId: string,
  operationId: string,
  input: ProgressUpdateInput,
): Promise<{ record: ProgressRecord; replayed: boolean }> {
  const requestHash = createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [userId, operationId],
    );
    const replay = await client.query<{
      requestHash: string;
      responseBody: { data: ProgressRecord };
    }>(
      `SELECT request_hash AS "requestHash", response_body AS "responseBody"
         FROM idempotency_records WHERE user_id = $1 AND operation_id = $2 FOR UPDATE`,
      [userId, operationId],
    );
    if (replay.rows[0]) {
      if (replay.rows[0].requestHash !== requestHash) {
        throw new ApiProblem(
          409,
          'OPERATION_ID_REUSED',
          'This operation ID was already used for a different request.',
        );
      }
      await client.query('COMMIT');
      return { record: replay.rows[0].responseBody.data, replayed: true };
    }

    const courseResult = await client.query<{
      courseId: string;
      manualProgressAllowed: boolean;
    }>(
      `SELECT id AS "courseId", manual_progress_allowed AS "manualProgressAllowed"
         FROM courses WHERE id = $1 AND active = true FOR UPDATE`,
      [input.courseId],
    );
    const course = courseResult.rows[0];
    if (!course)
      throw new ApiProblem(
        404,
        'COURSE_NOT_FOUND',
        'The requested course does not exist.',
      );
    const currentResult = await client.query<{
      progressId: string;
      percentage: number;
      status: ProgressStatus;
      source: ProgressRecord['source'];
      version: number;
    }>(
      `SELECT id AS "progressId", percentage, status, source, version
         FROM course_progress
        WHERE course_id = $1 AND user_id = $2
        FOR UPDATE`,
      [input.courseId, userId],
    );
    const storedProgress = currentResult.rows[0];
    const current = {
      manualProgressAllowed: course.manualProgressAllowed,
      progressId: storedProgress?.progressId ?? null,
      percentage: storedProgress?.percentage ?? 0,
      status: storedProgress?.status ?? ('not_started' as const),
      source: storedProgress?.source ?? ('manual' as const),
      version: storedProgress?.version ?? 0,
    };
    if (!current.manualProgressAllowed) {
      throw new ApiProblem(
        403,
        'MANUAL_PROGRESS_NOT_ALLOWED',
        'This course accepts progress only from its provider.',
      );
    }
    if (current.version !== input.expectedVersion) {
      throw new ApiProblem(
        409,
        'VERSION_CONFLICT',
        'Progress changed since it was loaded.',
        {
          currentVersion: current.version,
        },
      );
    }
    if (
      current.source === 'provider' &&
      current.status === 'completed' &&
      input.percentage < 100
    ) {
      throw new ApiProblem(
        409,
        'PROVIDER_COMPLETION_PROTECTED',
        'Provider-verified completion cannot be reduced manually.',
      );
    }

    const status: ProgressStatus =
      input.percentage === 100
        ? 'completed'
        : input.percentage === 0
          ? 'not_started'
          : 'in_progress';
    const progressResult = current.progressId
      ? await client.query<{
          id: string;
          courseId: string;
          percentage: number;
          status: ProgressStatus;
          source: ProgressRecord['source'];
          version: number;
          updatedAt: Date;
        }>(
          `UPDATE course_progress
              SET percentage = $1, status = $2, source = 'manual',
                  evidence_metadata = jsonb_build_object('operationId', $3),
                  started_at = CASE WHEN $1 > 0 THEN COALESCE(started_at, now()) ELSE started_at END,
                  completed_at = CASE WHEN $1 = 100 THEN now() ELSE NULL END,
                  updated_at = now(), version = version + 1
            WHERE id = $4 AND version = $5
        RETURNING id, course_id AS "courseId", percentage, status, source, version,
                  updated_at AS "updatedAt"`,
          [
            input.percentage,
            status,
            operationId,
            current.progressId,
            current.version,
          ],
        )
      : await client.query<{
          id: string;
          courseId: string;
          percentage: number;
          status: ProgressStatus;
          source: ProgressRecord['source'];
          version: number;
          updatedAt: Date;
        }>(
          `INSERT INTO course_progress
             (id, user_id, course_id, percentage, status, source, evidence_metadata,
              started_at, completed_at, updated_at, version)
           VALUES
             ($1, $2, $3, $4, $5, 'manual', jsonb_build_object('operationId', $6),
              CASE WHEN $4 > 0 THEN now() ELSE NULL END,
              CASE WHEN $4 = 100 THEN now() ELSE NULL END, now(), 1)
           RETURNING id, course_id AS "courseId", percentage, status, source, version,
                     updated_at AS "updatedAt"`,
          [
            randomUUID(),
            userId,
            input.courseId,
            input.percentage,
            status,
            operationId,
          ],
        );
    if (!progressResult.rows[0]) {
      throw new ApiProblem(
        409,
        'VERSION_CONFLICT',
        'Progress changed while the request was being saved.',
      );
    }
    const progress = progressResult.rows[0];
    const record: ProgressRecord = {
      ...progress,
      updatedAt: progress.updatedAt.toISOString(),
    };
    const correlationId = randomUUID();

    await client.query(
      `INSERT INTO audit_events
         (actor_user_id, subject_user_id, action, resource_type, resource_id,
          outcome, correlation_id, metadata)
       VALUES ($1, $1, 'course_progress.updated', 'course_progress', $2,
               'success', $3, jsonb_build_object('oldVersion', $4, 'newVersion', $5, 'source', 'manual'))`,
      [userId, progress.id, correlationId, current.version, progress.version],
    );
    await client.query(
      `INSERT INTO outbox_events
         (actor_user_id, aggregate_type, aggregate_id, event_type, payload, contract_version)
       VALUES ($1, 'course_progress', $2, 'course_progress.updated',
               jsonb_build_object('userId', $1, 'courseId', $3, 'percentage', $4,
                                  'status', $5, 'source', 'manual', 'version', $6), '1.0')`,
      [
        userId,
        progress.id,
        input.courseId,
        input.percentage,
        status,
        progress.version,
      ],
    );
    await client.query(
      `INSERT INTO idempotency_records
         (user_id, operation_id, operation_type, request_hash, response_status, response_body, expires_at)
       VALUES ($1, $2, 'update_course_progress', $3, 200, $4::jsonb, now() + interval '90 days')`,
      [userId, operationId, requestHash, JSON.stringify({ data: record })],
    );
    await client.query('COMMIT');
    return { record, replayed: false };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

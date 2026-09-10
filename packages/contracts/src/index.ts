export type DataState = 'current' | 'stale' | 'partial' | 'unavailable';
export type EmploymentType = 'employee' | 'contractor';
export type ProgressSource = 'provider' | 'manual';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

export interface ExternalIdentity {
  provider: string;
  externalId: string;
  tenantId: string;
  mappingStatus: 'confirmed' | 'pending' | 'quarantined' | 'disabled';
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  jobRole: string | null;
  team: string | null;
  employmentType: EmploymentType | null;
  timezone: string;
  profileStatus: 'active' | 'pending_profile' | 'inactive';
  active: boolean;
  entitled: boolean;
  identities?: ExternalIdentity[];
}

export interface ProgressRecord {
  id: string;
  courseId: string;
  percentage: number;
  status: ProgressStatus;
  source: ProgressSource;
  version: number;
  updatedAt: string;
}

export interface DashboardCourse {
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
  progress: ProgressRecord;
}

export interface DashboardLearningPath {
  id: string;
  pathKey: string;
  name: string;
  description: string;
  versionNumber: number;
  assignmentStatus: string;
  courses: DashboardCourse[];
}

export interface ToolUsage {
  tool: string;
  percentage: number;
  qualifyingDays: number;
}

export interface DashboardSnapshot {
  user: UserProfile;
  metrics: {
    trained: number;
    adopted: number;
    points: number;
    badgesEarned: number;
    badgesTotal: number;
    weeksActive: number;
    weeksTotal: number;
    coursesCompleted: number;
    coursesTotal: number;
    certifications: number;
  };
  activity: Array<{
    weekStart: string;
    requestCount: number;
    qualifyingDays: number;
    dataState: DataState;
  }>;
  tools: ToolUsage[];
  badges: Array<{
    id: string;
    badgeKey: string;
    name: string;
    description: string;
    colorName: string;
    colorCode: string;
    state: 'earned' | 'in_progress' | 'locked';
    awardedAt: string | null;
  }>;
  paths: DashboardLearningPath[];
  certifications: Array<{
    id: string;
    certificationKey: string;
    certificationName: string;
    issuer: string;
    verificationStatus: string;
    verificationUrl: string | null;
    issuedAt: string;
  }>;
  knowledgeCheck: {
    title: string;
    score: number;
    passed: boolean;
    submittedAt: string;
  } | null;
  freshness: {
    state: DataState;
    dataThrough: string | null;
  };
  benchmark: {
    publishable: boolean;
    cohortSize: number;
    minimumCohortSize: number;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    correlationId: string;
    details?: unknown;
  };
}

export interface ApiResponse<T> {
  data: T;
  meta: {
    source: 'postgresql';
    contractVersion: '1.0';
    replayed?: boolean;
  };
}

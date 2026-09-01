export type DataState = 'current' | 'stale' | 'partial' | 'unavailable';
export type EmploymentType = 'employee' | 'contractor';
export type ProgressSource = 'provider' | 'manual';

export interface ExternalIdentity { source: string; externalId: string; tenantId?: string }
export interface UserProfile { id: string; displayName: string; email: string; role: string; team: string; employmentType: EmploymentType; status: 'active' | 'pending_profile' | 'inactive'; entitled: boolean; identities: ExternalIdentity[] }
export interface Course { id: string; title: string; provider: string; durationMinutes: number; badgeId: string; eligibleFor: EmploymentType[]; manualProgressAllowed: boolean }
export interface ProgressRecord { courseId: string; percentage: number; status: 'not_started' | 'in_progress' | 'completed'; source: ProgressSource; version: number; updatedAt: string }
export interface ToolUsage { tool: string; percentage: number; qualifyingDays: number }
export interface DashboardSnapshot { user: UserProfile; trained: number; adopted: number; points: number; badgesEarned: number; weeks: number[]; tools: ToolUsage[]; dataState: DataState; refreshedAt: string }
export interface ConnectorPage<T> { records: T[]; nextCursor?: string; sourceTimestamp: string; contractVersion: '1.0' }
export interface ProviderConnector<T> { healthCheck(): Promise<{ ok: boolean; message: string }>; fetchPage(input: { cursor?: string; limit: number; since?: string }): Promise<ConnectorPage<T>> }
export interface ApiError { error: { code: string; message: string; correlationId: string; details?: unknown } }

import type { Course, DashboardSnapshot, UserProfile } from '../../contracts/src/index';

export const currentUser: UserProfile = {
  id: '7c986e20-43a2-4a86-817d-6effc840ca91', displayName: 'Priya Kowalski', email: 'priya.kowalski@example.invalid',
  role: 'Senior Software Engineer', team: 'Digital Commerce', employmentType: 'employee', status: 'active', entitled: true,
  identities: [{ source: 'entra', externalId: '00000000-0000-4000-8000-000000000101', tenantId: '00000000-0000-4000-8000-000000000001' }],
};

export const courses: Course[] = [
  { id: 'ai-foundations', title: 'AI Foundations', provider: 'OpenAI Academy', durationMinutes: 60, badgeId: 'primer', eligibleFor: ['employee','contractor'], manualProgressAllowed: true },
  { id: 'responsible-ai', title: 'Responsible AI & SW Governance', provider: 'SW Internal', durationMinutes: 60, badgeId: 'primer', eligibleFor: ['employee','contractor'], manualProgressAllowed: true },
  { id: 'copilot-intro', title: 'Introduction to GitHub Copilot', provider: 'Microsoft Learn', durationMinutes: 60, badgeId: 'first-coat', eligibleFor: ['employee'], manualProgressAllowed: false },
  { id: 'claude-code', title: 'Claude Code in Action', provider: 'Anthropic Academy', durationMinutes: 150, badgeId: 'second-coat', eligibleFor: ['employee','contractor'], manualProgressAllowed: true },
  { id: 'mcp-intro', title: 'Introduction to Model Context Protocol', provider: 'Anthropic Academy', durationMinutes: 120, badgeId: 'emerald', eligibleFor: ['employee','contractor'], manualProgressAllowed: true },
];

export const dashboard: DashboardSnapshot = {
  user: currentUser, trained: 83, adopted: 76, points: 12480, badgesEarned: 4,
  weeks: [28,42,36,55,68,64,72,78,61,84,88,92],
  tools: [{ tool:'GitHub Copilot',percentage:42,qualifyingDays:16 },{ tool:'Claude',percentage:28,qualifyingDays:11 },{ tool:'Codex',percentage:18,qualifyingDays:8 },{ tool:'Other',percentage:12,qualifyingDays:5 }],
  dataState: 'current', refreshedAt: '2026-09-02T05:30:00.000Z',
};

export const scenarios = {
  'happy-path': { user: currentUser, dashboard, courses },
  'pending-profile': { user: { ...currentUser, status: 'pending_profile' as const }, dashboard: { ...dashboard, dataState: 'partial' as const }, courses },
  'contractor-limited-catalog': { user: { ...currentUser, employmentType: 'contractor' as const }, dashboard, courses: courses.filter((c) => c.eligibleFor.includes('contractor')) },
  'stale-dataset': { user: currentUser, dashboard: { ...dashboard, dataState: 'stale' as const, refreshedAt: '2026-08-30T05:30:00.000Z' }, courses },
};

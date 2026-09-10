-- Deterministic development data for Cover the Codebase.
-- All people, identifiers, credentials, activity, and outcomes are synthetic.
BEGIN;

INSERT INTO teams (id, name, active, created_at, updated_at) VALUES
('a1000000-0000-4000-8000-000000000001', 'Digital Commerce', true, '2026-08-24T09:00:00Z', '2026-09-02T08:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO users (id, team_id, display_name, email, person_number, employment_type, job_role, timezone, profile_status, active, entitled, created_at, updated_at, version) VALUES
('7c986e20-43a2-4a86-817d-6effc840ca91', 'a1000000-0000-4000-8000-000000000001', 'Priya Kowalski', 'priya.kowalski@example.invalid', 'P-104827', 'employee', 'Senior Software Engineer', 'America/New_York', 'active', true, true, '2026-08-24T09:10:00Z', '2026-09-02T08:15:00Z', 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO external_identities (id, user_id, provider, external_id, tenant_id, mapping_status, created_at, updated_at) VALUES
('b2000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'entra', '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'confirmed', '2026-08-24T09:10:00Z', '2026-08-24T09:10:00Z'),
('b2000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', 'hr', 'P-104827', '', 'confirmed', '2026-08-24T09:10:00Z', '2026-08-24T09:10:00Z'),
('b2000000-0000-4000-8000-000000000003', '7c986e20-43a2-4a86-817d-6effc840ca91', 'learning', 'learner-104827', '', 'confirmed', '2026-08-24T09:10:00Z', '2026-08-24T09:10:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning_paths (id, path_key, name, description, version_number, target_role, active, effective_from, effective_to) VALUES
('c3000000-0000-4000-8000-000000000001', 'individual-contributor', 'Individual Contributor Path', 'Hands-on AI learning for software engineers.', 2, 'individual_contributor', true, '2026-09-01T00:00:00Z', NULL),
('c3000000-0000-4000-8000-000000000002', 'electives', 'Ad Hoc Electives', 'Optional learning available at any time.', 1, 'all', true, '2026-09-01T00:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO courses (id, course_key, title, provider, provider_course_id, provider_url, duration_minutes, eligibility, manual_progress_allowed, active, created_at, updated_at) VALUES
('d4000000-0000-4000-8000-000000000001', 'ai-foundations', 'AI Foundations', 'OpenAI Academy', 'oa-ai-foundations', 'https://academy.openai.com/', 60, 'all', true, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000002', 'responsible-ai', 'Responsible AI & SW Governance', 'SW Internal', 'sw-responsible-ai', NULL, 60, 'all', true, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000003', 'copilot-intro', 'Introduction to GitHub Copilot', 'Microsoft Learn', 'ms-copilot-intro', 'https://learn.microsoft.com/training/modules/introduction-to-github-copilot/', 60, 'employee', false, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000004', 'prompt-engineering', 'Applied Prompt Engineering', 'OpenAI Academy', 'oa-prompt-engineering', 'https://academy.openai.com/', 90, 'all', true, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000005', 'github-copilot-practice', 'GitHub Copilot in Practice', 'Pluralsight', 'ps-copilot-practice', 'https://www.pluralsight.com/paths/github-copilot-in-practice', 300, 'employee', false, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000006', 'claude-code-in-action', 'Claude Code in Action', 'Anthropic Academy', 'anthropic-claude-code', 'https://anthropic.skilljar.com/claude-code-in-action', 150, 'all', true, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z'),
('d4000000-0000-4000-8000-000000000007', 'mcp-advanced', 'MCP: Advanced Topics', 'Anthropic Academy', 'anthropic-mcp-advanced', 'https://anthropic.skilljar.com/', 120, 'all', true, true, '2026-08-28T14:00:00Z', '2026-09-01T09:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO learning_path_courses (id, learning_path_id, course_id, sequence_number, stage, required) VALUES
('e5000000-0000-4000-8000-000000000001', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000001', 1, 'primer', true),
('e5000000-0000-4000-8000-000000000002', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002', 2, 'primer', true),
('e5000000-0000-4000-8000-000000000003', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000003', 3, 'first-coat', true),
('e5000000-0000-4000-8000-000000000004', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000004', 4, 'cut-in', true),
('e5000000-0000-4000-8000-000000000005', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000005', 5, 'cut-in', true),
('e5000000-0000-4000-8000-000000000006', 'c3000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000006', 6, 'second-coat', true),
('e5000000-0000-4000-8000-000000000007', 'c3000000-0000-4000-8000-000000000002', 'd4000000-0000-4000-8000-000000000007', 1, 'emerald', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_path_assignments (id, user_id, learning_path_id, status, assignment_reason, assigned_at, completed_at) VALUES
('f6000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'c3000000-0000-4000-8000-000000000001', 'active', 'hr_role_mapping', '2026-09-01T08:00:00Z', NULL),
('f6000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', 'c3000000-0000-4000-8000-000000000002', 'active', 'catalog_available', '2026-09-01T08:00:00Z', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO course_progress (id, user_id, course_id, percentage, status, source, evidence_metadata, started_at, completed_at, updated_at, version) VALUES
('11000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000001', 100, 'completed', 'provider', '{"providerEventId":"evt-1001"}', '2026-08-05T13:20:00Z', '2026-08-05T15:00:00Z', '2026-08-05T15:00:00Z', 2),
('11000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000002', 100, 'completed', 'manual', '{"operationId":"seed-responsible-ai"}', '2026-08-08T13:20:00Z', '2026-08-08T14:20:00Z', '2026-08-08T14:20:00Z', 2),
('11000000-0000-4000-8000-000000000003', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000003', 100, 'completed', 'provider', '{"providerEventId":"evt-1003"}', '2026-08-10T13:20:00Z', '2026-08-10T14:20:00Z', '2026-08-10T14:20:00Z', 2),
('11000000-0000-4000-8000-000000000004', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000004', 100, 'completed', 'provider', '{"providerEventId":"evt-1004"}', '2026-08-15T13:20:00Z', '2026-08-15T14:50:00Z', '2026-08-15T14:50:00Z', 2),
('11000000-0000-4000-8000-000000000005', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000005', 100, 'completed', 'provider', '{"providerEventId":"evt-1005"}', '2026-08-18T13:20:00Z', '2026-08-20T18:20:00Z', '2026-08-20T18:20:00Z', 2),
('11000000-0000-4000-8000-000000000006', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000006', 62, 'in_progress', 'manual', '{"operationId":"seed-claude-progress"}', '2026-08-30T13:20:00Z', NULL, '2026-09-02T08:40:00Z', 4),
('11000000-0000-4000-8000-000000000007', '7c986e20-43a2-4a86-817d-6effc840ca91', 'd4000000-0000-4000-8000-000000000007', 0, 'not_started', 'manual', NULL, NULL, NULL, '2026-09-01T08:00:00Z', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_checks (id, course_id, title, version_number, passing_score, questions, active) VALUES
('12000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002', 'Responsible AI Essentials', 1, 80, '[{"id":"q1","type":"single_choice","text":"Which information must not be stored?","options":[{"id":"a","text":"Course completion"},{"id":"b","text":"Raw AI prompts"}],"correctOptionIds":["b"],"points":1}]', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO knowledge_check_attempts (id, knowledge_check_id, user_id, attempt_number, submitted_answers, score, passed, submitted_at) VALUES
('13000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 2, '[{"questionId":"q1","optionIds":["b"]}]', 92, true, '2026-08-28T15:12:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges (id, badge_key, name, description, color_name, color_code, rule_version, rule_definition, active) VALUES
('14000000-0000-4000-8000-000000000001', 'primer', 'Primer', 'AI Fundamentals', 'Alabaster', '#EDEAE0', 1, '{"requiredStages":["primer"]}', true),
('14000000-0000-4000-8000-000000000002', 'first-coat', 'First Coat', 'Copilot in the IDE', 'Sea Salt', '#CBD5CC', 1, '{"requiredStages":["first-coat"]}', true),
('14000000-0000-4000-8000-000000000003', 'cut-in', 'Cut In', 'Prompt Engineering', 'Agreeable Gray', '#D1CBC1', 1, '{"requiredStages":["cut-in"]}', true),
('14000000-0000-4000-8000-000000000004', 'second-coat', 'Second Coat', 'Agent Workflows', 'Naval', '#2E3B4E', 1, '{"requiredStages":["second-coat"]}', true),
('14000000-0000-4000-8000-000000000005', 'emerald', 'Emerald', 'Library Contributor', 'Shamrock', '#2F6B4F', 1, '{"requiredStages":["emerald"]}', true),
('14000000-0000-4000-8000-000000000006', 'full-coverage', 'Full Coverage', 'Applied Mastery', 'Real Red', '#BC2B36', 1, '{"requiresBadges":5}', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_badges (id, user_id, badge_id, award_key, evidence, awarded_at, status) VALUES
('15000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', '14000000-0000-4000-8000-000000000001', 'badge:primer:user:7c986e20:rule:1', '{"courseProgressIds":["11000000-0000-4000-8000-000000000001","11000000-0000-4000-8000-000000000002"]}', '2026-08-08T14:21:00Z', 'active'),
('15000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', '14000000-0000-4000-8000-000000000002', 'badge:first-coat:user:7c986e20:rule:1', '{"courseProgressIds":["11000000-0000-4000-8000-000000000003"]}', '2026-08-10T14:21:00Z', 'active'),
('15000000-0000-4000-8000-000000000003', '7c986e20-43a2-4a86-817d-6effc840ca91', '14000000-0000-4000-8000-000000000003', 'badge:cut-in:user:7c986e20:rule:1', '{"courseProgressIds":["11000000-0000-4000-8000-000000000004","11000000-0000-4000-8000-000000000005"]}', '2026-08-20T18:21:00Z', 'active'),
('15000000-0000-4000-8000-000000000004', '7c986e20-43a2-4a86-817d-6effc840ca91', '14000000-0000-4000-8000-000000000004', 'badge:second-coat:user:7c986e20:rule:1', '{"courseProgressIds":["11000000-0000-4000-8000-000000000006"]}', '2026-09-02T08:45:00Z', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO point_ledger (id, user_id, entry_type, points, reason_code, award_key, evidence_type, evidence_id, created_at) VALUES
('16000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 1500, 'badge_earned', 'points:badge:15000001', 'user_badge', '15000000-0000-4000-8000-000000000001', '2026-08-08T14:21:01Z'),
('16000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 1500, 'badge_earned', 'points:badge:15000002', 'user_badge', '15000000-0000-4000-8000-000000000002', '2026-08-10T14:21:01Z'),
('16000000-0000-4000-8000-000000000003', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 1500, 'badge_earned', 'points:badge:15000003', 'user_badge', '15000000-0000-4000-8000-000000000003', '2026-08-20T18:21:01Z'),
('16000000-0000-4000-8000-000000000004', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 1500, 'badge_earned', 'points:badge:15000004', 'user_badge', '15000000-0000-4000-8000-000000000004', '2026-09-02T08:45:01Z'),
('16000000-0000-4000-8000-000000000005', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 3000, 'certification_verified', 'points:cert:17000001', 'user_certification', '17000000-0000-4000-8000-000000000001', '2026-09-01T12:00:01Z'),
('16000000-0000-4000-8000-000000000006', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 3000, 'certification_verified', 'points:cert:17000002', 'user_certification', '17000000-0000-4000-8000-000000000002', '2026-09-01T12:00:01Z'),
('16000000-0000-4000-8000-000000000007', '7c986e20-43a2-4a86-817d-6effc840ca91', 'award', 480, 'approved_activity', 'points:activity:2026-08-24', 'weekly_activity', '18000000-0000-4000-8000-000000000012', '2026-09-01T01:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_certifications (id, user_id, certification_key, certification_name, issuer, credential_id, verification_url, verification_status, issued_at, expires_at, verified_at) VALUES
('17000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'gh-300', 'GitHub Copilot Certification', 'GitHub', 'credly-demo-8f42c9', 'https://www.credly.com/', 'verified', '2026-06-10T00:00:00Z', '2028-06-10T00:00:00Z', '2026-09-01T12:00:00Z'),
('17000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', 'ai-102', 'Azure AI Engineer Associate', 'Microsoft', 'ms-demo-ai102-104827', 'https://learn.microsoft.com/credentials/', 'verified', '2026-07-12T00:00:00Z', '2027-07-12T00:00:00Z', '2026-09-01T12:00:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO weekly_activity (id, user_id, week_start, qualifying_days, request_count, input_tokens, output_tokens, estimated_cost, tool_mix, source, data_state, data_through) VALUES
('18000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-06-08', 1, 28, 28000, 11000, 3.2000, '[{"tool":"GitHub Copilot","percentage":48,"qualifyingDays":1},{"tool":"Claude","percentage":24,"qualifyingDays":1},{"tool":"Codex","percentage":16,"qualifyingDays":0},{"tool":"Other","percentage":12,"qualifyingDays":0}]', 'databricks_gold_ai_usage_v1', 'current', '2026-06-14T23:59:59Z'),
('18000000-0000-4000-8000-000000000002', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-06-15', 1, 42, 42000, 16000, 4.8000, '[{"tool":"GitHub Copilot","percentage":46,"qualifyingDays":1},{"tool":"Claude","percentage":25,"qualifyingDays":1},{"tool":"Codex","percentage":17,"qualifyingDays":0},{"tool":"Other","percentage":12,"qualifyingDays":0}]', 'databricks_gold_ai_usage_v1', 'current', '2026-06-21T23:59:59Z'),
('18000000-0000-4000-8000-000000000003', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-06-22', 1, 36, 36000, 13000, 4.1000, '[{"tool":"GitHub Copilot","percentage":45,"qualifyingDays":1},{"tool":"Claude","percentage":26,"qualifyingDays":1},{"tool":"Codex","percentage":17,"qualifyingDays":0},{"tool":"Other","percentage":12,"qualifyingDays":0}]', 'databricks_gold_ai_usage_v1', 'current', '2026-06-28T23:59:59Z'),
('18000000-0000-4000-8000-000000000004', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-06-29', 2, 55, 55000, 21000, 6.3000, '[{"tool":"GitHub Copilot","percentage":45,"qualifyingDays":2},{"tool":"Claude","percentage":26,"qualifyingDays":1},{"tool":"Codex","percentage":17,"qualifyingDays":1},{"tool":"Other","percentage":12,"qualifyingDays":0}]', 'databricks_gold_ai_usage_v1', 'current', '2026-07-05T23:59:59Z'),
('18000000-0000-4000-8000-000000000005', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-07-06', 3, 68, 68000, 27000, 7.9000, '[{"tool":"GitHub Copilot","percentage":44,"qualifyingDays":3},{"tool":"Claude","percentage":27,"qualifyingDays":2},{"tool":"Codex","percentage":17,"qualifyingDays":1},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-07-12T23:59:59Z'),
('18000000-0000-4000-8000-000000000006', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-07-13', 3, 64, 64000, 24000, 7.3000, '[{"tool":"GitHub Copilot","percentage":44,"qualifyingDays":3},{"tool":"Claude","percentage":27,"qualifyingDays":2},{"tool":"Codex","percentage":17,"qualifyingDays":1},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-07-19T23:59:59Z'),
('18000000-0000-4000-8000-000000000007', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-07-20', 4, 72, 72000, 28000, 8.4000, '[{"tool":"GitHub Copilot","percentage":43,"qualifyingDays":4},{"tool":"Claude","percentage":27,"qualifyingDays":2},{"tool":"Codex","percentage":18,"qualifyingDays":2},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-07-26T23:59:59Z'),
('18000000-0000-4000-8000-000000000008', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-07-27', 4, 78, 78000, 31000, 9.1000, '[{"tool":"GitHub Copilot","percentage":43,"qualifyingDays":4},{"tool":"Claude","percentage":27,"qualifyingDays":3},{"tool":"Codex","percentage":18,"qualifyingDays":2},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-08-02T23:59:59Z'),
('18000000-0000-4000-8000-000000000009', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-08-03', 3, 61, 61000, 23000, 7.0000, '[{"tool":"GitHub Copilot","percentage":43,"qualifyingDays":3},{"tool":"Claude","percentage":28,"qualifyingDays":2},{"tool":"Codex","percentage":17,"qualifyingDays":1},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-08-09T23:59:59Z'),
('18000000-0000-4000-8000-000000000010', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-08-10', 5, 84, 84000, 33000, 9.8000, '[{"tool":"GitHub Copilot","percentage":42,"qualifyingDays":5},{"tool":"Claude","percentage":28,"qualifyingDays":3},{"tool":"Codex","percentage":18,"qualifyingDays":2},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-08-16T23:59:59Z'),
('18000000-0000-4000-8000-000000000011', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-08-17', 5, 88, 88000, 35000, 10.3000, '[{"tool":"GitHub Copilot","percentage":42,"qualifyingDays":5},{"tool":"Claude","percentage":28,"qualifyingDays":3},{"tool":"Codex","percentage":18,"qualifyingDays":2},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-08-23T23:59:59Z'),
('18000000-0000-4000-8000-000000000012', '7c986e20-43a2-4a86-817d-6effc840ca91', '2026-08-24', 5, 92, 92000, 37000, 10.9000, '[{"tool":"GitHub Copilot","percentage":42,"qualifyingDays":5},{"tool":"Claude","percentage":28,"qualifyingDays":3},{"tool":"Codex","percentage":18,"qualifyingDays":2},{"tool":"Other","percentage":12,"qualifyingDays":1}]', 'databricks_gold_ai_usage_v1', 'current', '2026-08-30T23:59:59Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO idempotency_records (id, user_id, operation_id, operation_type, request_hash, response_status, response_body, created_at, expires_at) VALUES
('19000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', 'seed-responsible-ai', 'update_course_progress', '350b13530fd101d129acc539b129a71fe4f5c3ef9718bc50a9452632d9721eeb', 200, '{"data":{"id":"11000000-0000-4000-8000-000000000002","courseId":"d4000000-0000-4000-8000-000000000002","percentage":100,"status":"completed","source":"manual","version":2,"updatedAt":"2026-08-08T14:20:00.000Z"}}', '2026-08-08T14:20:00Z', '2026-10-08T14:20:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO audit_events (id, actor_user_id, subject_user_id, action, resource_type, resource_id, outcome, correlation_id, metadata, occurred_at) VALUES
('1a000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', '7c986e20-43a2-4a86-817d-6effc840ca91', 'course_progress.updated', 'course_progress', '11000000-0000-4000-8000-000000000002', 'success', 'seed-progress-responsible-ai', '{"oldVersion":1,"newVersion":2,"source":"manual"}', '2026-08-08T14:20:00Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO integration_runs (id, connector, direction, logical_run_key, status, checkpoint, expected_count, actual_count, expected_checksum, actual_checksum, data_state, error_summary, started_at, completed_at, data_through) VALUES
('1c000000-0000-4000-8000-000000000001', 'databricks_gold_ai_usage', 'import', 'databricks_gold_ai_usage:import:2026-09-02', 'succeeded', 'manifest-2026-09-02-001', 12, 12, 'sha256:demo-matched', 'sha256:demo-matched', 'current', '{"rejected":0,"warnings":0}', '2026-09-02T03:00:00Z', '2026-09-02T03:08:24Z', '2026-08-30T23:59:59Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO outbox_events (id, actor_user_id, integration_run_id, aggregate_type, aggregate_id, event_type, payload, contract_version, status, attempt_count, created_at, exported_at) VALUES
('1b000000-0000-4000-8000-000000000001', '7c986e20-43a2-4a86-817d-6effc840ca91', '1c000000-0000-4000-8000-000000000001', 'course_progress', '11000000-0000-4000-8000-000000000002', 'course_progress.updated', '{"userId":"7c986e20-43a2-4a86-817d-6effc840ca91","courseId":"d4000000-0000-4000-8000-000000000002","percentage":100,"source":"manual"}', '1.0', 'exported', 1, '2026-08-08T14:20:00Z', '2026-09-02T03:02:00Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;

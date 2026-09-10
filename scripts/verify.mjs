import { existsSync } from 'node:fs';

const required = [
  'database/schema.ts',
  'database/migrations/0000_initial.sql',
  'database/seed.sql',
  'apps/api/src/server.ts',
  'lib/backend.ts',
];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error(
    `Missing required PostgreSQL implementation files: ${missing.join(', ')}`,
  );
  process.exit(1);
}
if (existsSync('packages/test-data/src/scenarios.ts')) {
  console.error(
    'TypeScript scenario data must not be restored; use database/seed.sql.',
  );
  process.exit(1);
}
console.log(
  'Configuration check passed. PostgreSQL is the dashboard source of truth.',
);

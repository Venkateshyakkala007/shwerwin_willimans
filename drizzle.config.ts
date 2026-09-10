import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './database/schema.ts',
  out: './database/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      'postgresql://cover_app:cover_dev@localhost:5432/cover_codebase',
  },
  strict: true,
  verbose: true,
});

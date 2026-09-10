import { readFile } from 'node:fs/promises';
import process from 'node:process';
import pg from 'pg';

const sqlFile = process.argv[2];
if (!sqlFile) throw new Error('Usage: node scripts/run-sql.mjs <sql-file>');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (sqlFile.endsWith('seed.sql') && (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true'))
  throw new Error('Development seed data is prohibited in production');

const sql = await readFile(sqlFile, 'utf8');
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(sql);
  console.log(`Applied ${sqlFile}`);
} finally {
  await client.end();
}

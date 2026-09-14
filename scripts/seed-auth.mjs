import { randomBytes, scrypt as nodeScrypt } from 'node:crypto';
import process from 'node:process';
import { promisify } from 'node:util';
import pg from 'pg';

const scrypt = promisify(nodeScrypt);
const password = process.env.LOCAL_AUTH_PASSWORD;
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!password) throw new Error('LOCAL_AUTH_PASSWORD is required');
if (process.env.NODE_ENV === 'production')
  throw new Error('Local demo credential seeding is prohibited in production');

const demoEmails = [
  'priya.kowalski@example.invalid',
  'sam.rivera@example.invalid',
  'alex.morgan@example.invalid',
  'taylor.chen@example.invalid',
  'jordan.lee@example.invalid',
  'casey.patel@example.invalid',
  'morgan.reed@example.invalid',
];

async function hashPassword(value) {
  const salt = randomBytes(16);
  const cost = 16_384;
  const blockSize = 8;
  const parallelization = 1;
  const key = await scrypt(value, salt, 64, {
    N: cost,
    r: blockSize,
    p: parallelization,
    maxmem: 32 * 1024 * 1024,
  });
  return [
    'scrypt',
    cost,
    blockSize,
    parallelization,
    salt.toString('base64url'),
    key.toString('base64url'),
  ].join('$');
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  const users = await client.query(
    `SELECT id, email
       FROM users
      WHERE lower(email) = ANY($1::text[])
        AND active = true
        AND entitled = true
        AND profile_status = 'active'
      ORDER BY email`,
    [demoEmails],
  );
  for (const user of users.rows) {
    const passwordHash = await hashPassword(password);
    await client.query(
      `INSERT INTO v3.local_credential(user_id, password_hash)
       VALUES($1, $2)
       ON CONFLICT(user_id) DO UPDATE
         SET password_hash = EXCLUDED.password_hash,
             failed_attempts = 0,
             locked_until = NULL,
             password_updated_at = now(),
             updated_at = now()`,
      [user.id, passwordHash],
    );
  }
  await client.query('COMMIT');
  console.log(`Seeded local credentials for ${users.rowCount} active demo users`);
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}

import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { ApiProblem } from '../repository';
import { verifyPassword, hashPassword } from './password';
import { hashSessionToken } from './token';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const SESSION_HOURS = 24;
const dummyHash = hashPassword('not-a-real-local-password');

const invalidCredentials = (): ApiProblem =>
  new ApiProblem(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

export interface LoginResult {
  userId: string;
  token: string;
  expiresAt: Date;
}

interface CredentialRow {
  user_id: string;
  password_hash: string;
  failed_attempts: number;
  locked_until: Date | null;
  active: boolean;
  entitled: boolean;
  profile_status: string;
  employment_type: string;
}

export async function login(
  db: Pool,
  email: string,
  password: string,
): Promise<LoginResult> {
  const normalizedEmail = email.trim().toLowerCase();
  if (
    normalizedEmail.length < 3 ||
    normalizedEmail.length > 320 ||
    password.length < 1 ||
    password.length > 1024
  )
    throw invalidCredentials();

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<CredentialRow>(
      `SELECT c.user_id, c.password_hash, c.failed_attempts, c.locked_until,
              u.active, u.entitled, u.profile_status, u.employment_type
         FROM v3.local_credential c
         JOIN users u ON u.id = c.user_id
        WHERE lower(u.email) = $1
        FOR UPDATE OF c`,
      [normalizedEmail],
    );
    const credential = result.rows[0];
    const matches = await verifyPassword(
      password,
      credential?.password_hash ?? (await dummyHash),
    );
    const locked =
      credential?.locked_until !== null &&
      credential?.locked_until !== undefined &&
      credential.locked_until > new Date();
    const allowed =
      credential?.active &&
      credential.entitled &&
      credential.profile_status === 'active' &&
      ['employee', 'contractor'].includes(credential.employment_type);

    if (!credential || !matches || locked || !allowed) {
      if (credential && !locked) {
        await client.query(
          `UPDATE v3.local_credential
              SET failed_attempts = failed_attempts + 1,
                  locked_until = CASE
                    WHEN failed_attempts + 1 >= $2
                    THEN now() + ($3 * interval '1 minute')
                    ELSE NULL
                  END,
                  updated_at = now()
            WHERE user_id = $1`,
          [credential.user_id, MAX_FAILED_ATTEMPTS, LOCK_MINUTES],
        );
      }
      await client.query('COMMIT');
      throw invalidCredentials();
    }

    await client.query(
      `UPDATE v3.local_credential
          SET failed_attempts = 0, locked_until = NULL, updated_at = now()
        WHERE user_id = $1`,
      [credential.user_id],
    );
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
    await client.query(
      `INSERT INTO v3.auth_session(id, user_id, token_hash, expires_at)
       VALUES($1, $2, $3, $4)`,
      [randomUUID(), credential.user_id, hashSessionToken(token), expiresAt],
    );
    await client.query('COMMIT');
    return { userId: credential.user_id, token, expiresAt };
  } catch (error) {
    if (!(error instanceof ApiProblem)) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function authenticate(
  db: Pool,
  token: string | null,
): Promise<string | null> {
  if (!token || token.length > 256) return null;
  const result = await db.query<{ user_id: string }>(
    `SELECT user_id
       FROM v3.auth_session
      WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()`,
    [hashSessionToken(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function logout(db: Pool, token: string | null): Promise<void> {
  if (!token || token.length > 256) return;
  await db.query(
    `UPDATE v3.auth_session SET revoked_at = COALESCE(revoked_at, now())
      WHERE token_hash = $1`,
    [hashSessionToken(token)],
  );
}

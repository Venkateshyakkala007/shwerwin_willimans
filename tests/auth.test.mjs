import assert from 'node:assert/strict';
import test from 'node:test';
import { hashSessionToken } from '../apps/api/src/auth/token.ts';
import {
  clearSessionCookie,
  readSessionToken,
  sessionCookie,
} from '../apps/api/src/auth/cookie.ts';
import {
  hashPassword,
  verifyPassword,
} from '../apps/api/src/auth/password.ts';
process.env.DATABASE_URL ??=
  'postgresql://cover_app:cover_dev@localhost:5432/cover_codebase';
const { authenticate, login, logout } =
  await import('../apps/api/src/auth/index.ts');

void test('scrypt password hashes are salted and verifiable', async () => {
  const first = await hashPassword('local-test-password');
  const second = await hashPassword('local-test-password');
  assert.match(first, /^scrypt\$16384\$8\$1\$/);
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('local-test-password', first), true);
  assert.equal(await verifyPassword('wrong-password', first), false);
  assert.equal(await verifyPassword('local-test-password', 'invalid'), false);
});

void test('session token hashes are deterministic and do not reveal tokens', () => {
  const token = 'opaque-session-token';
  const hash = hashSessionToken(token);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashSessionToken(token));
  assert.equal(hash.includes(token), false);
});

void test('session cookies are strict, HttpOnly, and parse safely', () => {
  const cookie = sessionCookie('token-value', 3600, true);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Secure/);
  assert.equal(readSessionToken(`other=1; cover_session=token-value`), 'token-value');
  assert.match(clearSessionCookie(false), /Max-Age=0/);
});

void test('login stores only a session-token hash and resets failures', async () => {
  const passwordHash = await hashPassword('correct-password');
  const statements = [];
  const client = {
    async query(sql, params = []) {
      statements.push({ sql, params });
      if (sql.includes('FROM v3.local_credential'))
        return {
          rows: [{
            user_id: '01991a00-0000-7000-8000-000000000002',
            password_hash: passwordHash,
            failed_attempts: 2,
            locked_until: null,
            active: true,
            entitled: true,
            profile_status: 'active',
            employment_type: 'employee',
          }],
        };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  const result = await login(
    { connect: async () => client },
    '  SAM.RIVERA@EXAMPLE.INVALID ',
    'correct-password',
  );
  const insert = statements.find(({ sql }) => sql.includes('INSERT INTO v3.auth_session'));
  assert.ok(insert);
  assert.match(insert.params[2], /^[0-9a-f]{64}$/);
  assert.notEqual(insert.params[2], result.token);
  assert.ok(statements.some(({ sql }) => sql.includes('failed_attempts = 0')));
});

void test('locked and inactive accounts return the same generic failure', async () => {
  const passwordHash = await hashPassword('correct-password');
  for (const row of [
    {
      locked_until: new Date(Date.now() + 60_000),
      active: true,
      entitled: true,
      profile_status: 'active',
      employment_type: 'employee',
    },
    {
      locked_until: null,
      active: false,
      entitled: true,
      profile_status: 'inactive',
      employment_type: 'employee',
    },
  ]) {
    const client = {
      async query(sql) {
        if (sql.includes('FROM v3.local_credential'))
          return {
            rows: [{
              user_id: '01991a00-0000-7000-8000-000000000008',
              password_hash: passwordHash,
              failed_attempts: 0,
              ...row,
            }],
          };
        return { rows: [], rowCount: 1 };
      },
      release() {},
    };
    await assert.rejects(
      login({ connect: async () => client }, 'inactive@example.invalid', 'correct-password'),
      (error) =>
        error.code === 'INVALID_CREDENTIALS' &&
        error.message === 'Invalid email or password.',
    );
  }
});

void test('session lookup and logout always query by token hash', async () => {
  const calls = [];
  const db = {
    async query(sql, params) {
      calls.push({ sql, params });
      return sql.startsWith('SELECT')
        ? { rows: [{ user_id: '01991a00-0000-7000-8000-000000000002' }] }
        : { rows: [], rowCount: 1 };
    },
  };
  assert.equal(
    await authenticate(db, 'raw-session-token'),
    '01991a00-0000-7000-8000-000000000002',
  );
  await logout(db, 'raw-session-token');
  assert.equal(calls.length, 2);
  for (const call of calls) {
    assert.equal(call.params[0], hashSessionToken('raw-session-token'));
    assert.notEqual(call.params[0], 'raw-session-token');
  }
  assert.equal(await authenticate(db, null), null);
});

import { randomUUID } from 'node:crypto';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import { authenticate, login, logout } from './auth';
import {
  clearSessionCookie,
  readSessionToken,
  sessionCookie,
} from './auth/cookie';
import { pool } from './db';
import { ApiProblem } from './repository';
import * as v3 from './v3';

const port = Number(process.env.API_PORT ?? 4000);
const allowedOrigin =
  process.env.API_ALLOWED_ORIGIN ?? 'http://localhost:3000';
const demo = () =>
  process.env.NODE_ENV !== 'production' && process.env.DEMO_MODE === 'true';
const localAuth = () => process.env.AUTH_ADAPTER === 'local' || demo();
const secureCookies = process.env.NODE_ENV === 'production';
function send(
  res: ServerResponse,
  status: number,
  body: unknown,
  correlationId: string,
  extraHeaders: Record<string, string> = {},
) {
  res.writeHead(status, {
    'content-type':
      status >= 400
        ? 'application/problem+json'
        : 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-correlation-id': correlationId,
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
    'access-control-allow-headers':
      'content-type,x-client-operation-id,if-match',
    'access-control-expose-headers': 'x-correlation-id',
    ...(status === 429 ? { 'retry-after': '60' } : {}),
    ...extraHeaders,
  });
  res.end(status === 204 ? undefined : JSON.stringify(body));
}

async function json(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 65_536)
      throw new ApiProblem(
        413,
        'PAYLOAD_TOO_LARGE',
        'Request exceeds 64 KiB.',
      );
    chunks.push(buffer);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString());
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error();
    return value;
  } catch {
    throw new ApiProblem(400, 'INVALID_JSON', 'A JSON object is required.');
  }
}

function validateOrigin(req: IncomingMessage) {
  if (req.headers.origin !== allowedOrigin)
    throw new ApiProblem(
      403,
      'ORIGIN_DENIED',
      'The request origin is not allowed.',
    );
}

const server = createServer(async (req, res) => {
  const correlationId = randomUUID();
  const start = Date.now();
  res.once('finish', () =>
    console.log(
      JSON.stringify({
        event: 'http.completed',
        correlationId,
        method: req.method,
        status: res.statusCode,
        durationMs: Date.now() - start,
      }),
    ),
  );
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    const method = req.method ?? 'GET';
    if (method === 'OPTIONS') return send(res, 204, null, correlationId);
    if (method === 'GET' && path === '/api/v1/health/live')
      return send(res, 200, { status: 'ok' }, correlationId);
    if (method === 'GET' && path === '/api/v1/health/ready') {
      await pool.query('SELECT 1 FROM v3.policy LIMIT 1');
      return send(
        res,
        200,
        {
          status: 'ready',
          checks: { postgresql: true, v3Schema: true },
          analyticsMode: demo() ? 'synthetic' : 'disabled',
        },
        correlationId,
      );
    }

    if (!localAuth())
      throw new ApiProblem(
        503,
        'AUTH_NOT_CONFIGURED',
        'Authentication is not configured.',
      );

    if (method === 'POST' && path === '/api/v1/auth/login') {
      validateOrigin(req);
      const body = await json(req);
      if (typeof body.email !== 'string' || typeof body.password !== 'string')
        throw new ApiProblem(
          401,
          'INVALID_CREDENTIALS',
          'Invalid email or password.',
        );
      const result = await login(pool, body.email, body.password);
      const maxAge = Math.max(
        0,
        Math.floor((result.expiresAt.valueOf() - Date.now()) / 1000),
      );
      return send(
        res,
        200,
        { data: { authenticated: true } },
        correlationId,
        { 'set-cookie': sessionCookie(result.token, maxAge, secureCookies) },
      );
    }

    const token = readSessionToken(req.headers.cookie);
    if (method === 'POST' && path === '/api/v1/auth/logout') {
      validateOrigin(req);
      await logout(pool, token);
      return send(res, 204, null, correlationId, {
        'set-cookie': clearSessionCookie(secureCookies),
      });
    }

    const userId = await authenticate(pool, token);
    if (!userId)
      throw new ApiProblem(
        401,
        'UNAUTHENTICATED',
        'Authentication is required.',
      );
    await v3.authorize(pool, userId);
    const write = !['GET', 'HEAD'].includes(method);
    if (write) validateOrigin(req);
    await v3.limit(userId, write);

    let data: unknown;
    if (method === 'GET') {
      if (
        path === '/api/v1/session' ||
        path === '/api/v1/me' ||
        path === '/api/v1/me/profile'
      )
        data = await v3.session(userId);
      else if (
        path === '/api/v1/me/scorecard' ||
        path === '/api/v1/me/dashboard'
      )
        data = await v3.scorecard(userId);
      else if (
        path === '/api/v1/me/courses' ||
        path === '/api/v1/courses'
      )
        data = await v3.learning(userId, url.searchParams.get('q') ?? '');
      else if (path === '/api/v1/me/recognition')
        data = await v3.recognition(userId);
      else if (path === '/api/v1/me/assessments')
        data = await v3.assessments(userId);
      else if (path === '/api/v1/me/consumption')
        data = await v3.consumption(
          userId,
          url.searchParams.get('month') ??
            new Date().toISOString().slice(0, 7),
        );
      else if (path === '/api/v1/operations')
        data = await v3.operations(userId);
      else if (path === '/api/v1/status/freshness')
        data = (await v3.scorecard(userId)).publication;
      else if (/^\/api\/v1\/jobs\/[^/]+$/.test(path))
        data = await v3.jobResult(userId, path.split('/').at(-1)!);
      else if (/^\/api\/v1\/enrollments\/[^/]+\/evidence$/.test(path))
        data = await v3.evidence(userId, path.split('/')[4]);
      else if (/^\/api\/v1\/scopes\/[^/]+\/scorecard$/.test(path))
        data = await v3.scorecard(
          userId,
          v3.id(path.split('/')[4]),
          true,
        );
      else if (/^\/api\/v1\/scopes\/[^/]+\/people$/.test(path))
        data = await v3.people(
          userId,
          v3.id(path.split('/')[4]),
          url.searchParams.get('q') ?? '',
          url.searchParams.get('after') ?? '',
        );
      else if (/^\/api\/v1\/people\/[^/]+\/scorecard$/.test(path))
        data = await v3.scorecard(userId, v3.id(path.split('/')[4]));
      else throw new ApiProblem(404, 'NOT_FOUND', 'Route not found.');
    } else if (
      method === 'POST' &&
      /^\/api\/v1\/commands\/[a-z]+$/.test(path)
    ) {
      const match = req.headers['if-match'];
      const expected =
        typeof match === 'string' && /^"?\d+"?$/.test(match)
          ? Number(match.replaceAll('"', ''))
          : undefined;
      data = await v3.mutate(
        userId,
        String(req.headers['x-client-operation-id'] ?? ''),
        path.split('/').at(-1)!,
        await json(req),
        expected,
        correlationId,
      );
    } else if (path === '/api/v1/progress')
      throw new ApiProblem(
        410,
        'LEGACY_PROGRESS_RETIRED',
        'Use enrollment commands. A percentage cannot complete learning.',
      );
    else throw new ApiProblem(404, 'NOT_FOUND', 'Route not found.');
    send(
      res,
      200,
      {
        data,
        meta: {
          source: 'synthetic_demo',
          contractVersion: 'M25.1',
          correlationId,
        },
      },
      correlationId,
    );
  } catch (error) {
    const problem =
      error instanceof ApiProblem
        ? error
        : new ApiProblem(
            500,
            'INTERNAL_ERROR',
            'The request could not be completed.',
          );
    if (!(error instanceof ApiProblem))
      console.error(
        JSON.stringify({
          event: 'http.failed',
          correlationId,
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      );
    send(
      res,
      problem.status,
      {
        type: `urn:cover-codebase:problem:${problem.code.toLowerCase()}`,
        title: problem.code,
        status: problem.status,
        detail: problem.message,
        correlationId,
        error: {
          code: problem.code,
          message: problem.message,
          correlationId,
        },
      },
      correlationId,
    );
  }
});

server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.listen(port, process.env.API_HOST ?? '127.0.0.1', () =>
  console.log(`Cover the Codebase V3 API listening on ${port}`),
);
async function shutdown() {
  server.close();
  await pool.end();
}
process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());

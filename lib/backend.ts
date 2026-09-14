const backendUrl = (
  process.env.BACKEND_API_URL ?? 'http://127.0.0.1:4000'
).replace(/\/$/, '');

export async function proxyToBackend(
  request: Request,
  pathname: string,
): Promise<Response> {
  const requestUrl = new URL(request.url);
  const headers = new Headers();
  for (const name of [
    'content-type',
    'cookie',
    'x-client-operation-id',
    'if-match',
    'origin',
  ]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const response = await fetch(
      `${backendUrl}${pathname}${requestUrl.search}`,
      {
        method: request.method,
        headers,
        body:
          request.method === 'GET' || request.method === 'HEAD'
            ? undefined
            : await request.text(),
        cache: 'no-store',
      },
    );
    const responseHeaders = new Headers({
      'content-type':
        response.headers.get('content-type') ??
        'application/json; charset=utf-8',
      'cache-control': 'no-store',
    });
    const correlationId = response.headers.get('x-correlation-id');
    if (correlationId)
      responseHeaders.set('x-correlation-id', correlationId);
    const setCookies =
      (
        response.headers as Headers & {
          getSetCookie?: () => string[];
        }
      ).getSetCookie?.() ??
      (response.headers.get('set-cookie')
        ? [response.headers.get('set-cookie')!]
        : []);
    for (const cookie of setCookies) responseHeaders.append('set-cookie', cookie);
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return Response.json(
      {
        error: {
          code: 'BACKEND_UNAVAILABLE',
          message:
            'The PostgreSQL API is unavailable. Start the API service and database.',
          correlationId: crypto.randomUUID(),
        },
      },
      { status: 503 },
    );
  }
}

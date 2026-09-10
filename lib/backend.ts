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
    'x-client-operation-id',
    'x-demo-user-id',
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
    return new Response(response.body, {
      status: response.status,
      headers: {
        'content-type':
          response.headers.get('content-type') ??
          'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
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

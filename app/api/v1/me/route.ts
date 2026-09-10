import { proxyToBackend } from '../../../../lib/backend';

export async function GET(request: Request) {
  return proxyToBackend(request, '/api/v1/me');
}

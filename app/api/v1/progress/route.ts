import { proxyToBackend } from '../../../../lib/backend';

export async function PUT(request: Request) {
  return proxyToBackend(request, '/api/v1/progress');
}

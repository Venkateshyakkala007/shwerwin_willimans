import { proxyToBackend } from '../../../../lib/backend';
function forward(request: Request) { return proxyToBackend(request, new URL(request.url).pathname); }
export const GET = forward;
export const POST = forward;
export const PUT = forward;

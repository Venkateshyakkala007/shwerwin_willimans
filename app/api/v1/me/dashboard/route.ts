import { dashboard } from '../../../../../packages/test-data/src/scenarios';
export async function GET() { return Response.json({ data: dashboard, meta: { illustrative: true, contractVersion: '1.0' } }); }

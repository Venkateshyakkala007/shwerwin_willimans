import { currentUser } from '../../../../packages/test-data/src/scenarios';
export async function GET() { return Response.json({ data: currentUser, meta: { source: 'fake-entra-hr', contractVersion: '1.0' } }); }

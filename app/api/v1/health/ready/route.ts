import { fakeConnectors } from '../../../../../packages/connectors/src';
export async function GET() { const checks = await Promise.all(Object.entries(fakeConnectors).map(async ([name, connector]) => [name, await connector.healthCheck()])); return Response.json({ status:checks.every(([,v]) => (v as {ok:boolean}).ok) ? 'ready':'degraded', checks:Object.fromEntries(checks) }); }

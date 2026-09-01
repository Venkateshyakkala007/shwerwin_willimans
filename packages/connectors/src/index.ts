import { courses, currentUser, dashboard } from '../../test-data/src/scenarios';
import { FakeConnector } from './fake/base';
export const fakeConnectors = { identity: new FakeConnector([currentUser]), learning: new FakeConnector(courses), dashboard: new FakeConnector([dashboard]), databricks: new FakeConnector([{ manifestId:'gold-2026-09-02', count:1, checksum:'demo-checksum' }]) };
export function assertSafeAdapters() { if (process.env.NODE_ENV === 'production' && process.env.ALLOW_FAKE_CONNECTORS === 'true') throw new Error('Fake connectors are prohibited in production'); }

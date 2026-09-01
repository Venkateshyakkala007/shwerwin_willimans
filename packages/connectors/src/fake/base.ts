import type { ConnectorPage, ProviderConnector } from '../../../contracts/src/index';

export class FakeConnector<T> implements ProviderConnector<T> {
  constructor(private readonly records: T[], private readonly options: { fail?: boolean; delayMs?: number } = {}) {}
  async healthCheck() { return this.options.fail ? { ok: false, message: 'Simulated provider outage' } : { ok: true, message: 'Fake connector ready' }; }
  async fetchPage({ cursor, limit }: { cursor?: string; limit: number }): Promise<ConnectorPage<T>> {
    if (this.options.fail) throw new Error('SIMULATED_PROVIDER_UNAVAILABLE');
    if (this.options.delayMs) await new Promise((resolve) => setTimeout(resolve, this.options.delayMs));
    const offset = Number(cursor ?? 0); const records = this.records.slice(offset, offset + limit); const next = offset + records.length;
    return { records, nextCursor: next < this.records.length ? String(next) : undefined, sourceTimestamp: new Date().toISOString(), contractVersion: '1.0' };
  }
}

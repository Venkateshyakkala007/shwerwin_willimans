import { createHash } from 'node:crypto';

export const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

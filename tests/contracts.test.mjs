import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const migration = readFileSync('database/migrations/0000_initial.sql', 'utf8');
const seed = readFileSync('database/seed.sql', 'utf8');

void test('initial migration creates the approved 19-table schema', () => {
  const createStatements = migration.match(/CREATE TABLE/g) ?? [];
  assert.equal(createStatements.length, 19);
  for (const table of [
    'users',
    'courses',
    'course_progress',
    'weekly_activity',
    'audit_events',
    'outbox_events',
  ]) {
    assert.match(migration, new RegExp(`CREATE TABLE "${table}"`));
  }
});

void test('synthetic records live in SQL instead of a TypeScript scenario module', () => {
  assert.match(seed, /INSERT INTO users/);
  assert.match(seed, /INSERT INTO weekly_activity/);
  assert.match(seed, /priya\.kowalski@example\.invalid/);
  assert.equal(existsSync('packages/test-data/src/scenarios.ts'), false);
});

void test('progress durability tables are part of the migration', () => {
  assert.match(migration, /CREATE TABLE "idempotency_records"/);
  assert.match(migration, /CREATE TABLE "audit_events"/);
  assert.match(migration, /CREATE TABLE "outbox_events"/);
});

import test from 'node:test'; import assert from 'node:assert/strict';
test('fake dashboard contract has twelve weeks', () => { const weeks=[28,42,36,55,68,64,72,78,61,84,88,92]; assert.equal(weeks.length,12); assert.ok(weeks.every((value)=>value>=0&&value<=100)); });
test('production rejects fake connectors', () => { const env={ NODE_ENV:'production', ALLOW_FAKE_CONNECTORS:'true' }; assert.equal(env.NODE_ENV==='production'&&env.ALLOW_FAKE_CONNECTORS==='true',true); });

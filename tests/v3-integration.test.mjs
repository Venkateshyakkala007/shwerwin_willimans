import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const enabled=process.env.V3_INTEGRATION==='true';
void test('V3 PostgreSQL transactions, grants, evidence, publication and recovery', {skip:!enabled}, async t=>{
 const {pool}=await import('../apps/api/src/db.ts');
 const api=await import('../apps/api/src/v3.ts');
 const {queuePublication,runNightlySync}=await import('../apps/worker/src/index.ts');
 const employee='7c986e20-43a2-4a86-817d-6effc840ca91';
 const manager='01991a00-0000-7000-8000-000000000002';
 const contractor='01991a00-0000-7000-8000-000000000003';
 const missing='01991a00-0000-7000-8000-000000000004';
 const inactive='01991a00-0000-7000-8000-000000000008';
 const team='a1000000-0000-4000-8000-000000000001';
 const command=(action,body,version,op=randomUUID(),user=employee)=>api.mutate(user,op,action,body,version,randomUUID());
 try {
  await t.test('contractor catalogue excludes internal and licensed content',async()=>{const courses=await api.learning(contractor,'');assert.ok(courses.length>0);assert.ok(courses.every(c=>c.access_tier==='public'));await assert.rejects(()=>command('enroll',{courseVersionId:'d4000000-0000-4000-8000-000000000002'},undefined,randomUUID(),contractor),e=>e.status===403);});
  await t.test('inactive users and named peer access fail closed',async()=>{await assert.rejects(()=>api.session(inactive),e=>e.status===403);await assert.rejects(()=>api.scorecard(employee,contractor),e=>e.status===403);await assert.rejects(()=>api.people(employee,team,'',''),e=>e.status===403);});
  await t.test('attestation, retraction, stale versions and replay are transactional',async()=>{
   const list=await api.learning(employee,'MCP');let c=list[0];assert.ok(c);
   if(['completed','withdrawn'].includes(c.status)){await command('enroll',{courseVersionId:c.id});c=(await api.learning(employee,'MCP'))[0];}
   await assert.rejects(()=>command('progress',{enrollmentId:c.enrollment_id,percentage:100},c.version),e=>e.status===400);
   await assert.rejects(()=>command('attest',{enrollmentId:c.enrollment_id,confirmed:false,claimedAt:new Date().toISOString()},c.version),e=>e.status===400);
   await assert.rejects(()=>command('start',{enrollmentId:c.enrollment_id},c.version+99),e=>e.status===412);
   const op=randomUUID(),body={enrollmentId:c.enrollment_id,confirmed:true,claimedAt:new Date().toISOString()};
   const results=await Promise.all([command('attest',body,c.version,op),command('attest',body,c.version,op)]);
   assert.equal(results[0].status,'completed');assert.equal(results[1].id,results[0].id);
   assert.equal((await api.evidence(employee,c.enrollment_id)).length%2,1);
   await assert.rejects(()=>command('attest',{...body,confirmed:false},c.version,op),e=>e.status===409);
   const original=results[0];
   await pool.query('BEGIN');await pool.query('ROLLBACK');
   const revoked=await pool.query("UPDATE users SET entitled=false WHERE id=$1 RETURNING id",[employee]);assert.equal(revoked.rowCount,1);
   try {await assert.rejects(()=>command('attest',body,c.version,op),e=>e.status===403);} finally {await pool.query('UPDATE users SET entitled=true WHERE id=$1',[employee]);}
   const retract=await command('retract',{enrollmentId:c.enrollment_id},original.version);assert.equal(retract.status,'withdrawn');
   const history=await api.evidence(employee,c.enrollment_id);assert.equal(history.at(-1).kind,'retraction');
   const next=await command('enroll',{courseVersionId:c.id});assert.equal(next.attempt_number,c.attempt_number+1);
   const audit=await pool.query('SELECT 1 FROM audit_events WHERE resource_id=$1',[original.id]);assert.ok(audit.rowCount>=2);
   await assert.rejects(()=>pool.query("UPDATE v3.attestation SET statement='changed' WHERE enrollment_id=$1",[original.id]),/append-only/);
  });
  await t.test('assessment responses do not expose answer keys',async()=>{const checks=await api.assessments(employee);assert.ok(checks.length);assert.ok(!JSON.stringify(checks).includes('correctOptionIds'));assert.equal((await api.assessments(contractor)).length,0);const r=await command('assessment',{assessmentId:checks[0].id,answers:{q1:'b'}});assert.equal(r.score,100);});
  await t.test('worker publishes complete sample bundles and acknowledges durable events',async()=>{
   await queuePublication('integration:'+randomUUID());for(let n=0;n<100;n++){if(!await runNightlySync())break;}
   const card=await api.scorecard(employee);assert.equal(card.metrics.length,25);assert.equal(card.groups.length,5);assert.equal(card.groups.find(g=>g.group_code==='E').score,'80.00');assert.equal(card.groups.find(g=>g.group_code==='A').score,'91.25');
   assert.ok(card.metrics.every(m=>m.publication_id===card.publication.id));
   const noCI=await api.scorecard(manager,missing);assert.equal(noCI.groups.find(g=>g.group_code==='Q').score,null);assert.ok(noCI.groups.find(g=>g.group_code==='A').score);
   const contractorCard=await api.scorecard(contractor);assert.equal(contractorCard.groups.find(g=>g.group_code==='E').score,null);
   const scope=await api.scorecard(manager,team,true);assert.equal(scope.metrics.length,25);assert.ok(!scope.suppressed);
   await assert.rejects(()=>pool.query('UPDATE v3.metric_projection SET raw_value=0 WHERE publication_id=$1',[card.publication.id]),/immutable/);
   assert.ok((await api.operations(manager)).receiptCount>0);
  });
  await t.test('invalid import retains previous coherent publication',async()=>{
   const before=(await api.scorecard(employee)).publication.id;
   const original=(await pool.query('SELECT rows FROM v3.fixture WHERE subject_id=$1',[employee])).rows[0].rows;
   await pool.query('UPDATE v3.fixture SET rows=$2 WHERE subject_id=$1',[employee,JSON.stringify(original.slice(1))]);
   const key='bad-fixture:'+randomUUID();
   try {await queuePublication(key);await runNightlySync();assert.equal((await api.scorecard(employee)).publication.id,before);const job=(await pool.query('SELECT * FROM v3.job WHERE logical_key=$1',[key])).rows[0];assert.match(job.error,/25/);}
   finally {await pool.query('UPDATE v3.fixture SET rows=$2 WHERE subject_id=$1',[employee,JSON.stringify(original)]);await pool.query("UPDATE v3.job SET status='failed' WHERE logical_key=$1",[key]);}
  });
  await t.test('consumption preserves unknown currency and calendar months',async()=>{const c=await api.consumption(employee,'2026-09');assert.equal(c.record.remaining,'580.0000');assert.equal(c.record.cost,null);assert.equal((await api.consumption(employee,'2026-10')).record,null);});
  await t.test('export is durable and pinned to an immutable publication',async()=>{const r=await command('export',{});for(let n=0;n<20;n++){if(!await runNightlySync())break;}const job=await api.jobResult(employee,r.jobId);assert.equal(job.status,'succeeded');assert.equal(job.result.rows.length,25);await assert.rejects(()=>api.jobResult(contractor,r.jobId),e=>e.status===404);});
 } finally {await pool.end();}
});

import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { pool } from './db';
import { ApiProblem } from './repository';
import { uuid7 } from '../../../packages/v3/domain';
type DB = Pick<PoolClient,'query'>;
interface CourseVersion { id:string; assignment_id:string; repeatable:boolean }
interface Enrollment { id:string; course_version_id:string; version:number; status:string; percentage:number; enrolled_at:string; attestation_id:string|null }
const fail=(status:number,code:string,message:string):never=>{throw new ApiProblem(status,code,message);};
export const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function id(value:unknown):string { if(typeof value!=='string'||!UUID.test(value)) return fail(400,'INVALID_ID','A UUID identifier is required.'); return value; }
export async function authorize(db:DB,userId:string) {
 const r=await db.query('SELECT id,display_name,employment_type,job_role,active,entitled,profile_status FROM users WHERE id=$1',[id(userId)]);
 const u=r.rows[0]; if(!u||!u.active||!u.entitled||u.profile_status!=='active'||!['employee','contractor'].includes(u.employment_type)) fail(403,'ACCESS_DENIED','This account does not currently have application access.'); return u;
}
const eligible=`cv.active AND c.active AND ((cv.access_tier='public' AND cv.public_access_verified AND cv.public_review_until>now()) OR (u.employment_type='employee' AND EXISTS(SELECT 1 FROM v3.content_entitlement ce WHERE ce.user_id=u.id AND ce.course_version_id=cv.id)))`;
async function courseFor(db:DB,userId:string,versionId:string) {
 const r=await db.query(`SELECT cv.*,a.id AS assignment_id FROM v3.course_version cv JOIN courses c ON c.id=cv.course_id JOIN users u ON u.id=$1 JOIN v3.assignment a ON a.user_id=u.id AND a.course_version_id=cv.id AND a.status='active' WHERE cv.id=$2 AND ${eligible}`,[userId,id(versionId)]);
 if(!r.rows[0]) fail(403,'COURSE_DENIED','An active eligible assignment is required for this course.'); return r.rows[0];
}
async function grant(db:DB,userId:string,scopeId:string,permission:string) {
 const r=await db.query('SELECT 1 FROM v3.scope_grant WHERE user_id=$1 AND scope_id=$2 AND permission=$3',[userId,id(scopeId),permission]);
 if(!r.rowCount) fail(403,'SCOPE_DENIED','You do not have permission for this scope or field.');
}
async function personGrant(db:DB,actor:string,subject:string,permission='detail') {
 if(actor===subject) return;
 const r=await db.query(`SELECT 1 FROM v3.membership m JOIN v3.scope_grant g ON g.scope_id=m.unit_id WHERE m.user_id=$2 AND g.user_id=$1 AND g.permission=$3 AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now())`,[actor,id(subject),permission]);
 if(!r.rowCount) fail(403,'PERSON_DENIED','Individual detail requires a current scope grant.');
}
async function publication(db:DB) {
 const r=await db.query(`SELECT p.* FROM v3.serving_pointer s JOIN v3.publication p ON p.id=s.publication_id WHERE s.slot='main' AND p.state='published'`);
 return r.rows[0]??null;
}
export async function limit(userId:string,write:boolean) {
 const r=await pool.query(`INSERT INTO v3.rate_limit VALUES($1,$2,date_trunc('minute',now()),1) ON CONFLICT(user_id,bucket,window_start) DO UPDATE SET count=v3.rate_limit.count+1 RETURNING count`,[userId,write?'write':'read']);
 if(r.rows[0].count>(write?30:120)) fail(429,'RATE_LIMITED','Please wait a minute before trying again.');
}
export async function scorecard(userId:string,subject:string=userId,isScope=false) {
 const client=await pool.connect();
 try {
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY'); await authorize(client,userId);
  if(isScope) await grant(client,userId,subject,'aggregate'); else await personGrant(client,userId,subject);
  const p=await publication(client);
  const definitions=await client.query('SELECT * FROM v3.metric_definition ORDER BY group_code,id');
  let suppressed=false;
  if(isScope) {
   const members=await client.query(`WITH RECURSIVE units AS (SELECT id FROM v3.organization_unit WHERE id=$1 UNION ALL SELECT u.id FROM v3.organization_unit u JOIN units p ON p.id=u.parent_id) SELECT count(DISTINCT m.user_id)::int AS n FROM v3.membership m JOIN units ON units.id=m.unit_id JOIN users u ON u.id=m.user_id WHERE u.active AND u.entitled AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now())`,[subject]);
   suppressed=members.rows[0].n<5;
  }
  const rows=p&&!suppressed?(await client.query('SELECT * FROM v3.metric_projection WHERE publication_id=$1 AND subject_id=$2 ORDER BY metric_id',[p.id,subject])).rows:[];
  const groups=p&&!suppressed?(await client.query('SELECT * FROM v3.group_projection WHERE publication_id=$1 AND subject_id=$2 ORDER BY group_code',[p.id,subject])).rows:[];
  await client.query('COMMIT');
  return {publication:p,subjectId:subject,source:'synthetic_fixture',suppressed,groups:['E','A','T','F','Q'].map(code=>groups.find(g=>g.group_code===code)??{group_code:code,score:null,status:suppressed?'suppressed':'unavailable'}),metrics:definitions.rows.map(d=>({...d,...(rows.find(r=>r.metric_id===d.id)??{raw_value:null,normalized_score:null,contribution:null,status:suppressed?'suppressed':'unavailable',sample_size:0,evidence:suppressed?'Small-cohort privacy policy (demo threshold 5).':'Publication not available yet.'})}))};
 } catch(e){await client.query('ROLLBACK');throw e;} finally{client.release();}
}
export async function session(userId:string) {
 const user=await authorize(pool,userId);
 const scopes=await pool.query(`SELECT o.id,o.name,o.kind,array_agg(g.permission ORDER BY g.permission) AS permissions FROM v3.scope_grant g JOIN v3.organization_unit o ON o.id=g.scope_id WHERE g.user_id=$1 GROUP BY o.id ORDER BY o.kind,o.name`,[userId]);
 return {user,scopes:scopes.rows,mode:'synthetic_demo',productionAuth:'not_configured'};
}
export async function learning(userId:string,search:string) {
 await authorize(pool,userId); if(search.length>100) fail(400,'SEARCH_TOO_LONG','Search is limited to 100 characters.');
 const r=await pool.query(`SELECT cv.id,cv.title,cv.access_tier,cv.version_number,cv.completion_mode,cv.repeatable,c.provider,c.provider_url,c.duration_minutes,a.required,a.due_at,
 e.id AS enrollment_id,e.attempt_number,e.status,e.percentage,e.version,e.attestation_id,e.completed_at,e.started_at,
 (SELECT count(*)::int FROM v3.enrollment h WHERE h.user_id=u.id AND h.course_version_id=cv.id) AS attempt_count,
 EXISTS(SELECT 1 FROM course_progress legacy WHERE legacy.user_id=u.id AND legacy.course_id=c.id AND legacy.status='completed') AS legacy_completion
 FROM v3.course_version cv JOIN courses c ON c.id=cv.course_id JOIN users u ON u.id=$1
 JOIN v3.assignment a ON a.user_id=u.id AND a.course_version_id=cv.id AND a.status='active'
 LEFT JOIN LATERAL (SELECT * FROM v3.enrollment e WHERE e.user_id=u.id AND e.course_version_id=cv.id ORDER BY attempt_number DESC LIMIT 1) e ON true
 WHERE ${eligible} AND (cv.title ILIKE $2 OR c.provider ILIKE $2) ORDER BY a.required DESC,cv.title,cv.id LIMIT 50`,[userId,`%${search.replace(/[\\%_]/g,'\\$&')}%`]);
 return r.rows;
}
export async function evidence(userId:string,enrollmentId:string) {
 await authorize(pool,userId);
 const e=await pool.query('SELECT * FROM v3.enrollment WHERE id=$1 AND user_id=$2',[id(enrollmentId),userId]);
 if(!e.rows[0]) fail(404,'NOT_FOUND','Enrollment not found.'); await courseFor(pool,userId,e.rows[0].course_version_id);
 return (await pool.query(`SELECT kind,statement,claimed_at,received_at,retracts_id FROM v3.attestation WHERE enrollment_id=$1 ORDER BY received_at LIMIT 50`,[enrollmentId])).rows;
}
export async function recognition(userId:string) {
 await authorize(pool,userId);
 const [badges,points,certifications]=await Promise.all([
 pool.query(`SELECT b.name,b.description,ub.awarded_at FROM user_badges ub JOIN badges b ON b.id=ub.badge_id WHERE ub.user_id=$1 AND ub.status='active' ORDER BY ub.awarded_at DESC LIMIT 50`,[userId]),
 pool.query('SELECT COALESCE(sum(points),0)::int AS total FROM point_ledger WHERE user_id=$1',[userId]),
 pool.query('SELECT certification_name,issuer,verification_status,issued_at FROM user_certifications WHERE user_id=$1 ORDER BY issued_at DESC LIMIT 50',[userId])]);
 return {badges:badges.rows,points:points.rows[0].total,certifications:certifications.rows,source:'legacy_synthetic_seed'};
}
export async function consumption(userId:string,month:string,subject=userId) {
 await authorize(pool,userId); await personGrant(pool,userId,subject); await personGrant(pool,userId,subject,'cost');
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail(400,'INVALID_MONTH','Use a calendar month in YYYY-MM format.');
 const p=await publication(pool); if(!p)return {publication:null,record:null};
 const r=await pool.query(`SELECT *,CASE WHEN allocation IS NOT NULL AND credits IS NOT NULL THEN allocation-credits ELSE NULL END AS remaining FROM v3.consumption_projection WHERE publication_id=$1 AND user_id=$2 AND month=$3`,[p.id,subject,month+'-01']);
 return {publication:p,record:r.rows[0]??null};
}
export async function people(userId:string,scopeId:string,search:string,after:string) {
 await authorize(pool,userId);await grant(pool,userId,scopeId,'people');
 if(search.length>100)fail(400,'SEARCH_TOO_LONG','Search is limited to 100 characters.');if(after)id(after);
 const r=await pool.query(`WITH RECURSIVE units AS (SELECT id FROM v3.organization_unit WHERE id=$1 UNION ALL SELECT u.id FROM v3.organization_unit u JOIN units p ON p.id=u.parent_id)
 SELECT DISTINCT u.id,u.display_name,u.employment_type FROM users u JOIN v3.membership m ON m.user_id=u.id JOIN units ON units.id=m.unit_id WHERE u.active AND u.entitled AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now()) AND u.display_name ILIKE $2 AND ($3::uuid IS NULL OR u.id>$3) ORDER BY u.id LIMIT 26`,[scopeId,`%${search.replace(/[\\%_]/g,'\\$&')}%`,after||null]);
 return {rows:r.rows.slice(0,25),next:r.rows.length>25?r.rows[24].id:null};
}
export async function assessments(userId:string) {
 await authorize(pool,userId);
 const r=await pool.query(`SELECT kc.id,kc.title,kc.questions,kc.passing_score FROM knowledge_checks kc JOIN v3.course_version cv ON cv.course_id=kc.course_id JOIN courses c ON c.id=cv.course_id JOIN users u ON u.id=$1 JOIN v3.assignment a ON a.user_id=u.id AND a.course_version_id=cv.id AND a.status='active' WHERE kc.active AND ${eligible} LIMIT 25`,[userId]);
 return r.rows.map(k=>({id:k.id,title:k.title,passingScore:k.passing_score,questions:(k.questions as {id:string;text:string;options:{id:string;text:string}[]}[]).map(q=>({id:q.id,text:q.text,options:q.options}))}));
}
export async function operations(userId:string) {
 await authorize(pool,userId);
 if(!(await pool.query("SELECT 1 FROM v3.scope_grant WHERE user_id=$1 AND permission='operate'",[userId])).rowCount)fail(403,'OPERATIONS_DENIED','Operator permission required.');
 const [jobs,receipts,programme]=await Promise.all([pool.query("SELECT id,kind,status,attempts,created_at,finished_at,error FROM v3.job ORDER BY created_at DESC LIMIT 25"),pool.query('SELECT count(*)::int AS n FROM v3.outbox_receipt'),pool.query('SELECT count(DISTINCT user_id)::int AS n FROM v3.champion')]);
 return {jobs:jobs.rows,receiptCount:receipts.rows[0].n,champions:programme.rows[0].n,publication:await publication(pool),scheduler:'03:00 America/New_York',source:'synthetic_fixture'};
}
export async function jobResult(userId:string,jobId:string) {
 await authorize(pool,userId); const r=await pool.query('SELECT id,kind,status,result,error FROM v3.job WHERE id=$1 AND owner_id=$2',[id(jobId),userId]);
 if(!r.rows[0])fail(404,'NOT_FOUND','Job not found.');return r.rows[0];
}
export async function mutate(userId:string,operationId:string,action:string,body:Record<string,unknown>,expectedVersion:number|undefined,correlationId:string) {
 if(!operationId||operationId.length>128)fail(400,'OPERATION_ID_REQUIRED','A stable operation ID is required.');
 const hash=createHash('sha256').update(JSON.stringify({action,body,expectedVersion})).digest('hex');const client=await pool.connect();
 try {
  await client.query('BEGIN'); await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]); await authorize(client,userId);
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,operationId]);
  let cv:CourseVersion|undefined; let enrollment:Enrollment|undefined;
  if(['enroll','start','progress','attest','retract','withdraw'].includes(action)) {
   if(action==='enroll')cv=await courseFor(client,userId,id(body.courseVersionId));
   else {
    enrollment=(await client.query('SELECT * FROM v3.enrollment WHERE id=$1 AND user_id=$2 FOR UPDATE',[id(body.enrollmentId),userId])).rows[0];
    if(!enrollment)fail(404,'NOT_FOUND','Enrollment not found.');cv=await courseFor(client,userId,enrollment!.course_version_id);
   }
  } else if(action==='publish') {
   if(!(await client.query("SELECT 1 FROM v3.scope_grant WHERE user_id=$1 AND permission='operate'",[userId])).rowCount) fail(403,'OPERATIONS_DENIED','Operator permission required.');
  }
  const replay=(await client.query('SELECT * FROM v3.mutation_receipt WHERE user_id=$1 AND operation_id=$2',[userId,operationId])).rows[0];
  if(replay) {if(replay.request_hash!==hash)fail(409,'OPERATION_ID_REUSED','This operation ID was already used with different input.');await client.query('COMMIT');return {...replay.response,replayed:true};}
  if(enrollment && (expectedVersion===undefined||expectedVersion!==enrollment.version))fail(412,'VERSION_CONFLICT','This enrollment changed. Refresh and review before submitting again.');
  let result:Record<string,unknown>={};let resourceId=uuid7();
  if(action==='enroll') {
   const previous=(await client.query('SELECT * FROM v3.enrollment WHERE user_id=$1 AND course_version_id=$2 ORDER BY attempt_number DESC LIMIT 1',[userId,cv!.id])).rows[0];
   if(previous&&['enrolled','in_progress'].includes(previous.status))fail(409,'OPEN_ATTEMPT','An open attempt already exists.');
   if(previous&&!cv!.repeatable)fail(409,'NOT_REPEATABLE','This course does not allow another attempt.');
   result=(await client.query('INSERT INTO v3.enrollment(id,user_id,course_version_id,assignment_id,attempt_number) VALUES($1,$2,$3,$4,$5) RETURNING *',[resourceId,userId,cv!.id,cv!.assignment_id,(previous?.attempt_number??0)+1])).rows[0];
  } else if(enrollment) {
   resourceId=enrollment.id;
   if(action==='attest') {
    if(body.confirmed!==true)fail(400,'ATTESTATION_REQUIRED','Explicitly confirm that you completed this learning yourself.');
    if(!['enrolled','in_progress'].includes(enrollment.status))fail(409,'ATTEMPT_CLOSED','This attempt is already closed.');
    const claimed=new Date(String(body.claimedAt));if(!Number.isFinite(claimed.valueOf())||claimed.valueOf()>Date.now()+60000||claimed<new Date(enrollment.enrolled_at))fail(400,'INVALID_COMPLETION_TIME','Completion must be between enrollment and now.');
    const attestation=uuid7();
    await client.query(`INSERT INTO v3.attestation(id,enrollment_id,user_id,course_version_id,statement,claimed_at,kind) VALUES($1,$2,$3,$4,'I confirm that I completed this learning. This is self-attested, not provider-verified.',$5,'completion')`,[attestation,enrollment.id,userId,cv!.id,claimed]);
    result=(await client.query(`UPDATE v3.enrollment SET status='completed',percentage=100,started_at=COALESCE(started_at,$2),completed_at=$2,completion_authority='self_attested',attestation_id=$3,version=version+1 WHERE id=$1 RETURNING *`,[enrollment.id,claimed,attestation])).rows[0];
   } else if(action==='retract') {
    if(enrollment.status!=='completed'||!enrollment.attestation_id)fail(409,'NOT_ATTESTED','No active completion attestation exists.');
    await client.query(`INSERT INTO v3.attestation(id,enrollment_id,user_id,course_version_id,statement,claimed_at,kind,retracts_id) VALUES($1,$2,$3,$4,'I retract my previous completion attestation.',now(),'retraction',$5)`,[uuid7(),enrollment.id,userId,cv!.id,enrollment.attestation_id]);
    result=(await client.query(`UPDATE v3.enrollment SET status='withdrawn',percentage=0,completed_at=NULL,completion_authority=NULL,attestation_id=NULL,withdrawn_at=now(),version=version+1 WHERE id=$1 RETURNING *`,[enrollment.id])).rows[0];
   } else {
    if(!['enrolled','in_progress'].includes(enrollment.status))fail(409,'ATTEMPT_CLOSED','Start a new attempt to continue.');
    const percentage=action==='start'?Math.max(1,enrollment.percentage):body.percentage;
    if(action!=='withdraw'&&(!Number.isInteger(percentage)||Number(percentage)<0||Number(percentage)>99))fail(400,'PROGRESS_RANGE','Progress must be 0–99. Completion requires an attestation.');
    result=(await client.query(`UPDATE v3.enrollment SET status=$2,percentage=$3,started_at=CASE WHEN $3>0 THEN COALESCE(started_at,now()) ELSE started_at END,withdrawn_at=CASE WHEN $2='withdrawn' THEN now() ELSE NULL END,version=version+1 WHERE id=$1 RETURNING *`,[enrollment.id,action==='withdraw'?'withdrawn':'in_progress',action==='withdraw'?enrollment.percentage:percentage])).rows[0];
   }
  } else if(action==='assessment') {
   const check=(await client.query('SELECT * FROM knowledge_checks WHERE id=$1 AND active',[id(body.assessmentId)])).rows[0];
   if(!check)fail(404,'NOT_FOUND','Assessment not found.');
   const versions=await client.query('SELECT id FROM v3.course_version WHERE course_id=$1 AND active ORDER BY version_number DESC LIMIT 1',[check.course_id]);
   if(!versions.rowCount)fail(403,'ASSESSMENT_DENIED','Assessment is not assigned.');await courseFor(client,userId,versions.rows[0].id);
   const answers=body.answers;if(!answers||typeof answers!=='object'||Array.isArray(answers))fail(400,'ANSWERS_REQUIRED','Submit an answer for each question.');
   const questions=check.questions as {id:string;correctOptionIds:string[];options:{id:string}[]}[];
   const a=answers as Record<string,string>;
   if(questions.some(q=>!q.options.some(o=>o.id===a[q.id])))fail(400,'ANSWERS_REQUIRED','Select a valid answer for every question.');
   const score=Math.round(100*questions.filter(q=>q.correctOptionIds.includes(a[q.id])).length/questions.length);
   const num=(await client.query('SELECT COALESCE(max(attempt_number),0)+1 AS n FROM knowledge_check_attempts WHERE user_id=$1 AND knowledge_check_id=$2',[userId,check.id])).rows[0].n;
   await client.query('INSERT INTO knowledge_check_attempts(id,knowledge_check_id,user_id,attempt_number,submitted_answers,score,passed) VALUES($1,$2,$3,$4,$5,$6,$7)',[resourceId,check.id,userId,num,JSON.stringify(questions.map(q=>({questionId:q.id,optionIds:[a[q.id]]}))),score,score>=check.passing_score]);
   result={score,passed:score>=check.passing_score,attemptNumber:num};
  } else if(action==='publish'||action==='export') {
   const p=await publication(client);if(action==='export'&&!p)fail(409,'PUBLICATION_PENDING','No publication is available.');
   if(action==='export'&&((await client.query("SELECT 1 FROM v3.job WHERE owner_id=$1 AND kind='export' AND status IN ('queued','running') LIMIT 2",[userId])).rowCount??0)>=2)fail(429,'EXPORT_LIMIT','Two exports are already running.');
   await client.query('INSERT INTO v3.job(id,kind,logical_key,owner_id,payload) VALUES($1,$2,$3,$4,$5)',[resourceId,action==='publish'?'publication':'export',`${action}:${userId}:${operationId}`,userId,JSON.stringify({publicationId:p?.id})]);result={jobId:resourceId};
  } else fail(404,'UNKNOWN_ACTION','Unknown action.');
  if(enrollment||action==='enroll')await client.query('INSERT INTO v3.learning_event VALUES($1,$2,$3,$4,now(),now(),$5)',[uuid7(),resourceId,userId,action,JSON.stringify({version:result.version,attestationId:result.attestation_id??null})]);
  await client.query(`INSERT INTO audit_events(id,actor_user_id,subject_user_id,action,resource_type,resource_id,outcome,correlation_id,metadata) VALUES($1,$2,$2,$3,'v3_command',$4,'success',$5,$6)`,[uuid7(),userId,action,resourceId,correlationId,JSON.stringify({operationId})]);
  const eventId=uuid7();
  await client.query(`INSERT INTO outbox_events(id,actor_user_id,aggregate_type,aggregate_id,event_type,payload,contract_version) VALUES($1,$2,'v3_command',$3,$4,$5,'M25.1')`,[eventId,userId,resourceId,action,JSON.stringify({userId,resourceId,action,source:'self_attested_or_local_command'})]);
  await client.query(`INSERT INTO v3.job(id,kind,logical_key,owner_id,payload) VALUES($1,'learning_event',$2,$3,$4)`,[uuid7(),`event:${eventId}`,userId,JSON.stringify({eventId})]);
  await client.query('INSERT INTO v3.mutation_receipt(user_id,operation_id,request_hash,response) VALUES($1,$2,$3,$4)',[userId,operationId,hash,JSON.stringify(result)]);
  await client.query('COMMIT');return result;
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}

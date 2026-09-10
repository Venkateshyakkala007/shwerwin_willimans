import { createHash } from 'node:crypto';
import { pool } from '../../api/src/db';
import { assertDemo, easternSchedule, uuid7, validateAndScore, type MetricRow, type Definition } from '../../../packages/v3/domain';
export async function queuePublication(key: string) {
 assertDemo(); await pool.query(`INSERT INTO v3.job(id,kind,logical_key) VALUES($1,'publication',$2) ON CONFLICT(logical_key) DO NOTHING`,[uuid7(),key]);
}
export async function runNightlySync() {
 assertDemo(); const scheduled=easternSchedule(new Date()); if(scheduled) await queuePublication(`scheduled:${scheduled}`);
 const claimed=await pool.query(`WITH candidate AS (SELECT id FROM v3.job WHERE ((status='queued' AND available_at<=now()) OR (status='running' AND lease_until<now())) AND attempts<5 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) UPDATE v3.job j SET status='running',attempts=attempts+1,fencing_token=fencing_token+1,lease_until=now()+interval '60 seconds' FROM candidate c WHERE j.id=c.id RETURNING j.*`);
 const job=claimed.rows[0]; if(!job) return false; const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const lease=await client.query(`SELECT id FROM v3.job WHERE id=$1 AND fencing_token=$2 AND status='running' AND lease_until>now() FOR UPDATE`,[job.id,job.fencing_token]);
  if(!lease.rowCount) throw new Error('Worker lease lost'); let result: unknown={authority:'synthetic_local_sink'};
  if(job.kind==='publication') {
   await client.query('SELECT pg_advisory_xact_lock(253025)');
   const fixtures=await client.query('SELECT * FROM v3.fixture ORDER BY subject_id');
   const defs=await client.query<Definition>('SELECT id,group_code,weight_bps FROM v3.metric_definition ORDER BY id');
   const prepared=fixtures.rows.map(f=>({...f,groups:validateAndScore(f.rows as MetricRow[],defs.rows)}));
   const hash=createHash('sha256').update(JSON.stringify(fixtures.rows)).digest('hex'); const id=uuid7();
   await client.query(`INSERT INTO v3.publication(id,policy_id,source,state,manifest_hash,row_count,fixture_version) VALUES($1,'sample-M25.1-v1','synthetic_fixture','staging',$2,$3,'fixture-M25.1-v1')`,[id,hash,prepared.length*25]);
   for(const f of prepared) {
    for(const r of f.rows as MetricRow[]) {
     const weight=defs.rows.find(d=>d.id===r.id)!.weight_bps;
     await client.query('INSERT INTO v3.metric_projection VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,f.subject_id,r.id,r.raw,r.score,r.score===null?null:r.score*weight/10000,r.status,r.sampleSize,r.evidence,r.periodStart,r.periodEnd]);
    }
    for(const g of f.groups) await client.query('INSERT INTO v3.group_projection VALUES($1,$2,$3,$4,$5)',[id,f.subject_id,g.group,g.score,g.status]);
    if(f.consumption) { const c=f.consumption; await client.query('INSERT INTO v3.consumption_projection VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',[id,f.subject_id,c.month,c.tokens,c.credits,c.allocation,c.cost,c.currency,c.authority,c.coverage]); }
   }
   const count=await client.query('SELECT count(*)::int AS n FROM v3.metric_projection WHERE publication_id=$1',[id]);
   if(count.rows[0].n!==prepared.length*25) throw new Error('Publication count mismatch');
   await client.query("UPDATE v3.publication SET state='published',published_at=now() WHERE id=$1",[id]);
   await client.query("INSERT INTO v3.serving_pointer VALUES('main',$1) ON CONFLICT(slot) DO UPDATE SET publication_id=excluded.publication_id",[id]);
   result={publicationId:id,manifestHash:hash,metricRows:prepared.length*25,source:'synthetic_fixture'};
  } else if(job.kind==='learning_event') {
   const event=job.payload.eventId; if(!event) throw new Error('Missing outbox identity');
   await client.query(`INSERT INTO v3.outbox_receipt(event_id,job_id,authority) VALUES($1,$2,'synthetic_local_sink') ON CONFLICT DO NOTHING`,[event,job.id]);
   await client.query(`UPDATE outbox_events SET status='exported',exported_at=now(),attempt_count=attempt_count+1 WHERE id=$1`,[event]);
  } else if(job.kind==='export') {
   const user=await client.query('SELECT active,entitled,profile_status FROM users WHERE id=$1',[job.owner_id]);
   if(!user.rows[0]?.active||!user.rows[0]?.entitled||user.rows[0]?.profile_status!=='active') throw new Error('Export access revoked');
   const rows=await client.query('SELECT metric_id,raw_value,normalized_score,status,period_start,period_end FROM v3.metric_projection WHERE publication_id=$1 AND subject_id=$2 ORDER BY metric_id',[job.payload.publicationId,job.owner_id]);
   result={publicationId:job.payload.publicationId,source:'synthetic_fixture',rows:rows.rows};
  }
  await client.query(`UPDATE v3.job SET status='succeeded',result=$3,finished_at=now(),lease_until=NULL WHERE id=$1 AND fencing_token=$2`,[job.id,job.fencing_token,JSON.stringify(result)]);
  await client.query('COMMIT'); console.log(JSON.stringify({event:'job.completed',jobId:job.id,kind:job.kind,source:'synthetic_fixture'}));
 } catch(error) {
  await client.query('ROLLBACK');
  await pool.query(`UPDATE v3.job SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'queued' END,error=$3,available_at=now()+interval '10 seconds',lease_until=NULL WHERE id=$1 AND fencing_token=$2 AND status='running'`,[job.id,job.fencing_token,error instanceof Error?error.message:'Worker failed']);
  console.error(JSON.stringify({event:'job.failed',jobId:job.id,message:error instanceof Error?error.message:'Worker failed'}));
 } finally {client.release();} return true;
}

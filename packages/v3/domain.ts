import { randomBytes } from 'node:crypto';

export function uuid7(): string {
  const b = randomBytes(16);
  b.writeUIntBE(Date.now(), 0, 6);
  b[6] = 0x70 | (b[6] & 15); b[8] = 0x80 | (b[8] & 63);
  const h = b.toString('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function assertDemo() {
  if (process.env.NODE_ENV === 'production' || process.env.DEMO_MODE !== 'true') {
    throw new Error('Synthetic runtime requires DEMO_MODE=true and is prohibited in production');
  }
}
export interface MetricRow { id: string; raw: number | null; score: number | null; status: string; sampleSize: number; evidence: string; periodStart: string; periodEnd: string }
export interface Definition { id: string; group_code: string; weight_bps: number }
export function validateAndScore(rows: MetricRow[], definitions: Definition[]) {
  if (definitions.length !== 25 || rows.length !== 25 || new Set(rows.map(r=>r.id)).size !== 25) throw new Error('Publication requires exactly 25 distinct metrics');
  for (const d of definitions) {
    const r=rows.find(r=>r.id===d.id);
    if (!r || !['sample_backed','unavailable','normalization_pending','suppressed'].includes(r.status)) throw new Error('Invalid metric membership or state');
    if ((['E5','T1','F5'].includes(d.id)) !== (d.weight_bps===0)) throw new Error('Diagnostic weights differ from M25');
    if (r.raw!==null && !Number.isFinite(r.raw)) throw new Error('Invalid raw value');
    if (r.score!==null && (!Number.isFinite(r.score)||r.score<0||r.score>100)) throw new Error('Invalid normalized score');
    if (['suppressed','unavailable'].includes(r.status) && (r.raw!==null||r.score!==null)) throw new Error('Hidden result contains a value');
    if (!Number.isInteger(r.sampleSize)||r.sampleSize<0||!r.evidence||r.periodEnd<=r.periodStart) throw new Error('Invalid evidence context');
  }
  return ['E','A','T','F','Q'].map(group=>{
    const members=definitions.filter(d=>d.group_code===group);
    if(members.length!==5||members.reduce((n,d)=>n+d.weight_bps,0)!==10000) throw new Error('Group weights must total 10000 basis points');
    const positive=members.filter(d=>d.weight_bps>0);
    const blocked=positive.map(d=>rows.find(r=>r.id===d.id)!).find(r=>r.status!=='sample_backed'||r.score===null||r.raw===null);
    // Fixed point score cents × integer basis points; round only final group cents.
    const sum=positive.reduce((n,d)=>n+Math.round((rows.find(r=>r.id===d.id)!.score??0)*100)*d.weight_bps,0);
    return {group,score:blocked?null:Math.round(sum/10000)/100,status:blocked?(blocked.status==='sample_backed'?'unavailable':blocked.status):'sample_backed'};
  });
}
export function easternSchedule(now: Date): string | null {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  if(Number(p.hour)<3) return null;
  const date=`${p.year}-${p.month}-${p.day}`;
  // At 03:00 Eastern the applicable seasonal offset is unambiguous.
  for(const hour of ['07','08']) {
    const instant=`${date}T${hour}:00:00.000Z`;
    const local=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}).format(new Date(instant));
    if(local==='03') return instant;
  }
  throw new Error('Cannot resolve Eastern schedule');
}

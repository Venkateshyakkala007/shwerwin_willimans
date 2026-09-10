import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pool } from './db';
import { ApiProblem } from './repository';
import * as v3 from './v3';
const port=Number(process.env.API_PORT??4000);
const origin=process.env.API_ALLOWED_ORIGIN??'http://localhost:3000';
const demo=()=>process.env.NODE_ENV!=='production'&&process.env.DEMO_MODE==='true';
const profiles=[
 {id:'7c986e20-43a2-4a86-817d-6effc840ca91',name:'Priya Kowalski',role:'Employee'},
 {id:'01991a00-0000-7000-8000-000000000002',name:'Sam Rivera',role:'Manager / operator'},
 {id:'01991a00-0000-7000-8000-000000000003',name:'Alex Morgan',role:'Contractor'},
 {id:'01991a00-0000-7000-8000-000000000004',name:'Taylor Chen',role:'Missing CI evidence'},
 {id:'01991a00-0000-7000-8000-000000000008',name:'Inactive Demo',role:'Access denied scenario'},
];
function send(res:ServerResponse,status:number,body:unknown,correlationId:string) {
 res.writeHead(status,{'content-type':status>=400?'application/problem+json':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','x-correlation-id':correlationId,'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,PUT,OPTIONS','access-control-allow-headers':'content-type,x-client-operation-id,x-demo-user-id,if-match','access-control-expose-headers':'x-correlation-id',...(status===429?{'retry-after':'60'}:{})});res.end(status===204?undefined:JSON.stringify(body));
}
async function json(req:IncomingMessage):Promise<Record<string,unknown>> {
 const chunks:Buffer[]=[];let size=0;
 for await(const chunk of req){const b=Buffer.from(chunk);size+=b.length;if(size>65536)throw new ApiProblem(413,'PAYLOAD_TOO_LARGE','Request exceeds 64 KiB.');chunks.push(b);}
 try {const value=JSON.parse(Buffer.concat(chunks).toString());if(!value||typeof value!=='object'||Array.isArray(value))throw new Error();return value;}catch{throw new ApiProblem(400,'INVALID_JSON','A JSON object is required.');}
}
const server=createServer(async(req,res)=>{
 const correlationId=randomUUID(); const start=Date.now();
 res.once('finish',()=>console.log(JSON.stringify({event:'http.completed',correlationId,method:req.method,status:res.statusCode,durationMs:Date.now()-start})));
 try {
  const url=new URL(req.url??'/','http://localhost');const path=url.pathname;const method=req.method??'GET';
  if(method==='OPTIONS')return send(res,204,null,correlationId);
  if(method==='GET'&&path==='/api/v1/health/live')return send(res,200,{status:'ok'},correlationId);
  if(method==='GET'&&path==='/api/v1/health/ready') {await pool.query('SELECT 1 FROM v3.policy LIMIT 1');return send(res,200,{status:'ready',checks:{postgresql:true,v3Schema:true},analyticsMode:demo()?'synthetic':'disabled'},correlationId);}
  if(!demo())throw new ApiProblem(503,'AUTH_NOT_CONFIGURED','Production Entra authentication is not configured. The demo adapter is disabled.');
  if(method==='GET'&&path==='/api/v1/demo/profiles')return send(res,200,{data:profiles},correlationId);
  const userId=v3.id(req.headers['x-demo-user-id']??profiles[0].id);
  await v3.authorize(pool,userId);
  const write=!['GET','HEAD'].includes(method);
  if(write&&req.headers.origin&&req.headers.origin!==origin)throw new ApiProblem(403,'ORIGIN_DENIED','The request origin is not allowed.');
  await v3.limit(userId,write);
  let data:unknown;
  if(method==='GET') {
   if(path==='/api/v1/session'||path==='/api/v1/me'||path==='/api/v1/me/profile')data=await v3.session(userId);
   else if(path==='/api/v1/me/scorecard'||path==='/api/v1/me/dashboard')data=await v3.scorecard(userId);
   else if(path==='/api/v1/me/courses'||path==='/api/v1/courses')data=await v3.learning(userId,url.searchParams.get('q')??'');
   else if(path==='/api/v1/me/recognition')data=await v3.recognition(userId);
   else if(path==='/api/v1/me/assessments')data=await v3.assessments(userId);
   else if(path==='/api/v1/me/consumption')data=await v3.consumption(userId,url.searchParams.get('month')??new Date().toISOString().slice(0,7));
   else if(path==='/api/v1/operations')data=await v3.operations(userId);
   else if(path==='/api/v1/status/freshness')data=(await v3.scorecard(userId)).publication;
   else if(/^\/api\/v1\/jobs\/[^/]+$/.test(path))data=await v3.jobResult(userId,path.split('/').at(-1)!);
   else if(/^\/api\/v1\/enrollments\/[^/]+\/evidence$/.test(path))data=await v3.evidence(userId,path.split('/')[4]);
   else if(/^\/api\/v1\/scopes\/[^/]+\/scorecard$/.test(path))data=await v3.scorecard(userId,v3.id(path.split('/')[4]),true);
   else if(/^\/api\/v1\/scopes\/[^/]+\/people$/.test(path))data=await v3.people(userId,v3.id(path.split('/')[4]),url.searchParams.get('q')??'',url.searchParams.get('after')??'');
   else if(/^\/api\/v1\/people\/[^/]+\/scorecard$/.test(path))data=await v3.scorecard(userId,v3.id(path.split('/')[4]));
   else throw new ApiProblem(404,'NOT_FOUND','Route not found.');
  } else if(method==='POST'&&/^\/api\/v1\/commands\/[a-z]+$/.test(path)) {
   const match=req.headers['if-match'];const expected=typeof match==='string'&&/^"?\d+"?$/.test(match)?Number(match.replaceAll('"','')):undefined;
   data=await v3.mutate(userId,String(req.headers['x-client-operation-id']??''),path.split('/').at(-1)!,await json(req),expected,correlationId);
  } else if(path==='/api/v1/progress')throw new ApiProblem(410,'LEGACY_PROGRESS_RETIRED','Use enrollment commands. A percentage cannot complete learning.');
  else throw new ApiProblem(404,'NOT_FOUND','Route not found.');
  send(res,200,{data,meta:{source:'synthetic_demo',contractVersion:'M25.1',correlationId}},correlationId);
 }catch(error){const e=error instanceof ApiProblem?error:new ApiProblem(500,'INTERNAL_ERROR','The request could not be completed.');if(!(error instanceof ApiProblem))console.error(JSON.stringify({event:'http.failed',correlationId,message:error instanceof Error?error.message:'Unknown error'}));send(res,e.status,{type:`urn:cover-codebase:problem:${e.code.toLowerCase()}`,title:e.code,status:e.status,detail:e.message,correlationId,error:{code:e.code,message:e.message,correlationId}},correlationId);}
});
server.requestTimeout=15000;server.headersTimeout=10000;
server.listen(port,process.env.API_HOST??'127.0.0.1',()=>console.log(`Cover the Codebase V3 API listening on ${port}`));
async function shutdown(){server.close();await pool.end();}
process.once('SIGTERM',()=>void shutdown());process.once('SIGINT',()=>void shutdown());

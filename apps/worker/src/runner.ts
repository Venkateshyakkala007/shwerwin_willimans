import { pool } from '../../api/src/db';
import { queuePublication, runNightlySync } from './index';
import { assertDemo } from '../../../packages/v3/domain';
assertDemo(); let stop=false;
process.once('SIGTERM',()=>{stop=true;}); process.once('SIGINT',()=>{stop=true;});
try {
 await queuePublication('bootstrap:fixture-M25.1-v1');
 do { const worked=await runNightlySync(); if(process.env.WORKER_ONCE==='true'&&!worked) break; if(!worked) await new Promise(resolve=>setTimeout(resolve,1000)); } while(!stop);
} finally {await pool.end();}

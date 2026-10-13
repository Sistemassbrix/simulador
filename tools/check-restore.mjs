import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
const backup=process.argv[2];if(!backup||!fs.existsSync(backup))throw Error('Indique un postgres.dump existente');
const container='simulador-modern-restore-check',password=randomBytes(32).toString('hex');
function docker(args){const p=spawnSync('docker',args,{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr||p.stdout);return p.stdout.trim();}
const report={at:new Date().toISOString(),backup:path.basename(path.dirname(backup)),isolatedContainer:container};let created=false;
try{
 docker(['run','-d','--name',container,'--network','none','-e','POSTGRES_DB=simulador','-e','POSTGRES_USER=simulador','-e','POSTGRES_PASSWORD='+password,'postgres:16.13-bookworm']);created=true;
 let ready=false;for(let i=0;i<40;i++){const p=spawnSync('docker',['exec',container,'pg_isready','-h','127.0.0.1','-U','simulador','-d','simulador'],{encoding:'utf8'});if(p.status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('PostgreSQL de restauración no arrancó');
 docker(['cp',backup,container+':/tmp/backup.dump']);docker(['exec',container,'pg_restore','--exit-on-error','-U','simulador','-d','simulador','/tmp/backup.dump']);
 const counts=docker(['exec',container,'psql','-U','simulador','-d','simulador','-At','-c',"SELECT json_build_object('usuarios',(SELECT count(*) FROM usuarios),'granos',(SELECT count(*) FROM granos),'maquinaria',(SELECT count(*) FROM maquinaria),'historial_simulaciones',(SELECT count(*) FROM historial_simulaciones))"]);
 report.counts=JSON.parse(counts);const expected={usuarios:11,granos:8,maquinaria:22,historial_simulaciones:2};if(JSON.stringify(report.counts)!==JSON.stringify(expected))throw Error('Conteos restaurados difieren de la fuente');
 for(const table of Object.keys(expected)){const query=`SELECT coalesce(json_agg(t ORDER BY id),'[]'::json) FROM ${table} t`;const read=name=>docker(['exec',name,'psql','-U','simulador','-d','simulador','-At','-c',query]);if(read(container)!==read('simulador-modern-db'))throw Error('Contenido restaurado difiere: '+table);}
 report.allFieldsMatch=true;report.success=true;
}catch(e){report.success=false;report.error=String(e);process.exitCode=1;}finally{if(created)docker(['rm','-f','-v',container]);fs.mkdirSync('docs/results',{recursive:true});fs.writeFileSync('docs/results/restore.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));}

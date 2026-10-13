import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source='C:/xampp/htdocs/simulador',proxy='C:/Produccion/nexust/proxy/default.conf';
const manifest=JSON.parse(fs.readFileSync('private/source-manifest.json','utf8'));const changed=[];
for(const [file,expected]of Object.entries(manifest)){const location=path.join(source,file);if(!fs.existsSync(location)||hash(fs.readFileSync(location))!==expected)changed.push(file);}
const report={at:new Date().toISOString(),sourceChangedFiles:changed,proxyUnchanged:hash(fs.readFileSync(proxy))===hash(fs.readFileSync('private/proxy-original.conf')),services:{}};
for(const host of ['app.simulador.local','app.ibesweb.local','app.nexust.com','db.nexust.com','api.nexust.com','ollama.nexust.com','hikvision.nexust.com']){const r=spawnSync('curl.exe',['--max-time','12','-s','-o','NUL','-w','%{http_code}','-H','Host: '+host,'http://127.0.0.1/'],{encoding:'utf8'});report.services[host]={http:r.stdout.trim(),exit:r.status};}
const reach=spawnSync('docker',['exec','nexust-proxy','curl','--max-time','8','-s','-o','/dev/null','-w','%{http_code}','http://host.docker.internal:8282/'],{encoding:'utf8'});report.proxyCanReachPreview={http:reach.stdout.trim(),exit:reach.status};
fs.writeFileSync('docs/results/coexistence.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(changed.length||!report.proxyUnchanged||report.services['app.simulador.local'].http!=='200'||report.services['app.ibesweb.local'].http!=='200'||reach.stdout!=='200')process.exitCode=1;

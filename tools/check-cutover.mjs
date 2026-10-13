import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';

const hash=b=>createHash('sha256').update(b).digest('hex');
const original=fs.readFileSync('private/proxy-original.conf');
const proposal=fs.readFileSync('deployment/proxy-proposed.conf');
const expected=Buffer.from(original.toString('utf8').replace('proxy_pass http://host.docker.internal:82;','proxy_pass http://host.docker.internal:8282;'),'utf8');
const current=fs.readFileSync('C:/Produccion/nexust/proxy/default.conf');
const report={at:new Date().toISOString(),url:'http://app.simulador.local/',trafficSwitched:true,onlyAuthorizedUpstreamChanged:expected.equals(proposal)&&current.equals(proposal),sourceChangedFiles:[],services:{}};
for(const [file,expectedHash]of Object.entries(JSON.parse(fs.readFileSync('private/source-manifest.json','utf8')))){const location=path.join('C:/xampp/htdocs/simulador',file);if(!fs.existsSync(location)||hash(fs.readFileSync(location))!==expectedHash)report.sourceChangedFiles.push(file);}
const before=JSON.parse(fs.readFileSync('docs/results/coexistence.json','utf8'));
for(const host of Object.keys(before.services)){const r=spawnSync('curl.exe',['--max-time','12','-s','-o','NUL','-w','%{http_code}','-H','Host: '+host,'http://127.0.0.1/'],{encoding:'utf8'});report.services[host]={http:r.stdout.trim(),exit:r.status,matchesBefore:r.stdout.trim()===before.services[host].http&&r.status===before.services[host].exit};}
const old=spawnSync('curl.exe',['--max-time','8','-s','-o','NUL','-w','%{http_code}','http://127.0.0.1:82/'],{encoding:'utf8'});report.originalStillAvailable=old.status===0&&old.stdout==='200';
const response=await fetch(report.url),html=await response.text();
report.newFrontend=response.status===200&&html.includes('id="root"')&&html.includes('/assets/');
report.api={csrf:(await fetch(report.url+'api/auth/csrf')).status,unauthenticatedUsers:(await fetch(report.url+'api/usuarios')).status};
report.success=report.onlyAuthorizedUpstreamChanged&&!report.sourceChangedFiles.length&&Object.values(report.services).every(s=>s.matchesBefore)&&report.originalStillAvailable&&report.newFrontend&&report.api.csrf===200&&report.api.unauthenticatedUsers===401;
fs.writeFileSync('docs/results/cutover.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.success)process.exitCode=1;

import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
fs.mkdirSync('private',{recursive:true});
if(!fs.existsSync('.env')){const password=randomBytes(32).toString('hex');fs.writeFileSync('.env',`POSTGRES_DB=simulador\nPOSTGRES_USER=simulador\nPOSTGRES_PASSWORD=${password}\nCOOKIE_SECURE=false\nSESSION_HOURS=0.4\nPREVIEW_PORT=8282\n`);}
fs.mkdirSync('tests/fixtures',{recursive:true});
const bytes=fs.readFileSync('private/active-data.json');const source=JSON.parse(bytes[0]===255?bytes.toString('utf16le').replace(/^\uFEFF/,''):bytes.toString('utf8'));
fs.writeFileSync('private/active-data.json',JSON.stringify(source,null,2),'utf8');
fs.mkdirSync('docs/results',{recursive:true});fs.writeFileSync('docs/results/source-counts.json',JSON.stringify({captured_at:source.captured_at,tables:Object.fromEntries(Object.entries(source.tables).map(([name,rows])=>[name,{count:rows.length,last_date:rows.reduce((date,r)=>(r.creado_en||'')>date?r.creado_en:date,'')}]))},null,2));
const original=fs.readFileSync('C:/Produccion/nexust/proxy/default.conf');fs.writeFileSync('private/proxy-original.conf',original);
const text=original.toString('utf8'),old='proxy_pass http://host.docker.internal:82;',next='proxy_pass http://host.docker.internal:8282;';const pos=text.indexOf('server_name app.simulador.local;');if(pos<0||text.indexOf(old,pos)<0)throw Error('Regla inesperada; revisar manualmente');
fs.writeFileSync('deployment/proxy-proposed.conf',text.slice(0,pos)+text.slice(pos).replace(old,next));
console.log('Secretos locales creados; respaldo y propuesta proxy preparados.');

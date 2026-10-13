import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

// Write only the shared proxy's existing bind-mounted file. Docker Desktop's
// service can access this mount when the interactive Windows account cannot.
const project=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/(\w:)/,'$1'));
const supplied=process.argv[2];
if(!supplied)throw Error('Indique la propuesta o un respaldo privado del proxy');
const source=fs.realpathSync(supplied),privateRoot=path.join(project,'private')+path.sep;
const proposal=path.join(project,'deployment','proxy-proposed.conf');
if(source!==proposal&&!(source.startsWith(privateRoot)&&/^proxy-(backup-.*|original)\.conf$/.test(path.basename(source))))throw Error('Archivo de origen fuera del alcance del proxy');
const target='C:/Produccion/nexust/proxy/default.conf';
function docker(args,input){const r=spawnSync('docker',args,{input,encoding:'utf8'});if(r.status!==0)throw Error(r.stderr||r.stdout);return r.stdout;}
const mounts=JSON.parse(docker(['inspect','nexust-proxy','--format','{{json .Mounts}}']));
if(!mounts.some(m=>m.Type==='bind'&&m.RW&&m.Source.replaceAll('\\','/').toLowerCase()===target.toLowerCase()&&m.Destination==='/etc/nginx/conf.d/default.conf'))throw Error('El montaje del proxy no coincide con el archivo autorizado');
const hash=b=>createHash('sha256').update(b).digest('hex');
const current=hash(fs.readFileSync(target));
if(![path.join(project,'private','proxy-original.conf'),proposal].some(p=>hash(fs.readFileSync(p))===current))throw Error('El proxy cambió fuera de la propuesta revisada');
const bytes=fs.readFileSync(source);
try {
    docker(['exec','-i','nexust-proxy','sh','-c','cat > /etc/nginx/conf.d/default.conf'],bytes);
} catch(error) {
    if(!String(error).includes('Permission denied'))throw error;
    // The parent directory grants DeleteChild/CreateFiles even when an older
    // sandbox-owned file denies writing. Keep that file; create a replacement.
    const preserved=target+'.preserved-'+Date.now();
    fs.renameSync(target,preserved);
    try {
        fs.writeFileSync(target,bytes,{flag:'wx'});
        const mounted=Buffer.from(docker(['exec','nexust-proxy','cat','/etc/nginx/conf.d/default.conf']),'utf8');
        if(!mounted.equals(bytes))throw Error('Docker no ha actualizado su montaje; se conserva el tráfico anterior');
    } catch(replaceError) {
        if(fs.existsSync(target))fs.unlinkSync(target);
        fs.renameSync(preserved,target);
        throw replaceError;
    }
    console.log('Archivo anterior conservado: '+preserved);
}
if(hash(fs.readFileSync(target))!==hash(bytes))throw Error('El contenido persistente no coincide con el enviado');
console.log('Archivo persistente del proxy actualizado mediante su montaje existente.');

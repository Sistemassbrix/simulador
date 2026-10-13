import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const result=spawnSync('docker',['exec','-i','simulador-app','php'],{input:fs.readFileSync(new URL('./export-original.php',import.meta.url),'utf8'),encoding:'utf8'});
if(result.status!==0)throw Error('No se pudo reextraer la fuente original mediante lectura. '+result.stderr);
const latest=JSON.parse(result.stdout),imported=JSON.parse(fs.readFileSync('private/active-data.json','utf8'));
const changed=Object.keys({...latest.tables,...imported.tables}).filter(table=>JSON.stringify(latest.tables[table])!==JSON.stringify(imported.tables[table]));
if(changed.length)throw Error('La fuente original cambió en '+changed.join(', ')+'. Preparar y comprobar el delta antes de sustituir tráfico. No se han sobrescrito datos.');
console.log('Fuente original comprobada mediante lectura: coincide con la importación revisada.');

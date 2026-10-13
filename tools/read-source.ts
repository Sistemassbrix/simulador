import fs from 'node:fs';
export function readSource(file:string):any {
 const bytes=fs.readFileSync(file);const text=bytes[0]===255&&bytes[1]===254?bytes.toString('utf16le').replace(/^\uFEFF/,''):bytes.toString('utf8').replace(/^\uFEFF/,'');
 if(!file.endsWith('.sql')){const data=JSON.parse(text);if(!data.tables)throw Error('Falta tables en exportación');return data;}
 const tables:Record<string,any[]>={};
 const inserts=/INSERT INTO `([^`]+)`\s*\(([^)]+)\)\s*VALUES\s*([\s\S]*?);\s*(?:\r?\n|$)/g;let match:RegExpExecArray|null;
 while((match=inserts.exec(text))){const table=match[1],columns=match[2].split(',').map(x=>x.trim().replaceAll('`',''));const rows:any[][]=[];let row:any[]=[],token='',quoted=false,inRow=false,escaped=false,wasQuoted=false;
 const commit=()=>{const value=wasQuoted?token:token.trim()==='NULL'?null:token.trim();row.push(value);token='';wasQuoted=false;};
 for(const char of match[3]){
  if(escaped){token+=({n:'\n',r:'\r',t:'\t','0':'\0',b:'\b',Z:'\x1a'} as Record<string,string>)[char]??char;escaped=false;continue;}
  if(quoted){if(char==='\\')escaped=true;else if(char==="'")quoted=false;else token+=char;continue;}
  if(char==="'"){if(!token.trim())token='';quoted=true;wasQuoted=true;continue;}
  if(char==='('){inRow=true;row=[];token='';continue;}
  if(!inRow)continue;
  if(char===','){commit();continue;}
  if(char===')'){commit();rows.push(row);inRow=false;continue;}
  if(!wasQuoted || !/\s/.test(char))token+=char;
 }
 tables[table]=(tables[table]||[]).concat(rows.map(values=>Object.fromEntries(columns.map((c,i)=>[c,values[i]]))));
 }
 if(!Object.keys(tables).length)throw Error('No se encontraron INSERT válidos');
 return{source:'SQL dump',tables};
}
export const models={usuarios:'usuario',granos:'grano',maquinaria:'maquinaria',historial_simulaciones:'historial'} as const;
export function convert(table:string,row:any){const data={...row,id:Number(row.id)};if(table==='historial_simulaciones')data.usuario_id=Number(row.usuario_id);if(data.creado_en)data.creado_en=new Date(/Z|\+\d\d:\d\d$/.test(data.creado_en)?data.creado_en:data.creado_en.replace(' ','T')+'Z');return data;}

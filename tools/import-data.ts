import {PrismaClient} from '@prisma/client';
import {readSource,models,convert} from './read-source';
async function main(){
const source=readSource(process.argv[2]||process.env.SOURCE_DATA||'private/active-data.json');
const extra=Object.keys(source.tables).filter(x=>!(x in models));if(extra.length)throw Error('Entidades nuevas sin mapear: '+extra.join(','));
const prisma=new PrismaClient();
try{await prisma.$transaction(async tx=>{
 for(const[table,model]of Object.entries(models)){
  for(const row of source.tables[table]||[]){const data=convert(table,row);const existing=await(tx[model]as any).findUnique({where:{id:data.id}});
   if(existing){for(const[k,v]of Object.entries(data)){const old=existing[k];const left=old instanceof Date?old.toISOString():old===null?null:String(old);const right=v instanceof Date?v.toISOString():v===null?null:String(v);if((table==='maquinaria'&&['caudal_aire','holding'].includes(k))?Number(left)!==Number(right):left!==right)throw Error(`Conflicto ${table} id=${data.id} campo=${k}. No se sobrescriben datos existentes.`);}}
   else await(tx[model]as any).create({data});
  }
  await tx.$queryRawUnsafe(`SELECT setval(pg_get_serial_sequence('${table}','id'), COALESCE((SELECT MAX(id) FROM ${table}),1), EXISTS(SELECT 1 FROM ${table}))`);
 }
},{timeout:60000});console.log(JSON.stringify({source:source.source,counts:Object.fromEntries(Object.keys(models).map(t=>[t,source.tables[t]?.length||0])),result:'Importación idempotente completa'},null,2));}finally{await prisma.$disconnect();}

}
main().catch(e=>{console.error(e);process.exitCode=1;});

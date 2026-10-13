import {PrismaClient} from '@prisma/client';
import fs from 'node:fs';
import {readSource,models,convert} from './read-source';
async function main(){
const source=readSource(process.argv[2]||process.env.SOURCE_DATA||'private/active-data.json');const db=new PrismaClient();
const report:any={at:new Date().toISOString(),source:source.source,tables:{},discrepancies:[]};
try{for(const[table,model]of Object.entries(models)){const rows=await(db[model]as any).findMany({orderBy:{id:'asc'}});const expected=source.tables[table]||[];report.tables[table]={expected:expected.length,actual:rows.length};if(rows.length!==expected.length)report.discrepancies.push(table+': count');
 for(const row of expected){const data=convert(table,row),actual=rows.find((x:any)=>x.id===data.id);if(!actual){report.discrepancies.push(table+': missing '+data.id);continue;}for(const[k,v]of Object.entries(data)){let a=actual[k],b:any=v;if(a instanceof Date)a=a.toISOString();if(b instanceof Date)b=b.toISOString();if(['caudal_aire','holding'].includes(k)&&a!==null&&b!==null){a=Number(a);b=Number(b);}if(String(a)!==String(b))report.discrepancies.push(`${table}:${data.id}:${k}`);}}
 report.tables[table].sequence=await db.$queryRawUnsafe(`SELECT last_value, is_called FROM ${table}_id_seq`);
 }
 report.orphans=await db.$queryRaw`SELECT h.id FROM historial_simulaciones h LEFT JOIN usuarios u ON h.usuario_id=u.id WHERE u.id IS NULL`;
 fs.mkdirSync('docs/results',{recursive:true});fs.writeFileSync('docs/results/data-integrity.json',JSON.stringify(report,(_k,v)=>typeof v==='bigint'?v.toString():v,2));console.log(JSON.stringify(report,(_k,v)=>typeof v==='bigint'?v.toString():v,2));if(report.discrepancies.length)process.exitCode=1;
}finally{await db.$disconnect();}

}
main().catch(e=>{console.error(e);process.exitCode=1;});

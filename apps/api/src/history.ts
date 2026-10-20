import {Controller,Get,Post,Body,Req,Query,Inject,Module,UseGuards,ForbiddenException} from '@nestjs/common';
import {z} from 'zod';
import {Database} from './db';
import {AuthModule,SessionGuard,AuthRequest} from './auth';

const NOMBRES_MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

@Controller('historial')
@UseGuards(SessionGuard)
export class HistorialController{
 constructor(@Inject(Database)private db:Database){}

 @Get()
 async list(@Req()req:AuthRequest,@Query('usuario_id')queryUsuarioId?:string,@Query('estado')queryEstado?:string){
  const isAdmin=req.identity.cargo==='Administrador';
  const now=new Date();
  const currentYear=now.getFullYear();
  const currentMonth=now.getMonth();
  const startOfMonth=new Date(currentYear,currentMonth,1,0,0,0,0);
  const endOfMonth=new Date(currentYear,currentMonth+1,0,23,59,59,999);

  if(isAdmin){
   const users=await this.db.usuario.findMany({select:{id:true,nombre:true,usuario:true,cargo:true}});
   const userMap=new Map(users.map(u=>[u.id,u]));

   const allScenarios=await this.db.historial.findMany({orderBy:{creado_en:'desc'}});

   const total_todos=allScenarios.length;
   const total_mes_todos=allScenarios.filter(s=>s.creado_en>=startOfMonth&&s.creado_en<=endOfMonth).length;
   const total_activos=allScenarios.filter(s=>!s.eliminado_por_usuario).length;
   const total_borrados_usuario=allScenarios.filter(s=>s.eliminado_por_usuario).length;

   const usuarios_stats=users.map(u=>{
    const uScenarios=allScenarios.filter(s=>s.usuario_id===u.id);
    const enMes=uScenarios.filter(s=>s.creado_en>=startOfMonth&&s.creado_en<=endOfMonth).length;
    const activos=uScenarios.filter(s=>!s.eliminado_por_usuario).length;
    const borrados=uScenarios.filter(s=>s.eliminado_por_usuario).length;
    return{
     id:u.id,
     nombre:u.nombre,
     usuario:u.usuario,
     cargo:u.cargo,
     total_mes:enMes,
     total_historico:uScenarios.length,
     total_activos:activos,
     total_borrados:borrados
    };
   });

   let filtered=allScenarios;
   if(queryUsuarioId&&queryUsuarioId!=='todos'){
    const uid=Number(queryUsuarioId);
    if(!isNaN(uid))filtered=filtered.filter(s=>s.usuario_id===uid);
   }
   if(queryEstado==='activos'){
    filtered=filtered.filter(s=>!s.eliminado_por_usuario);
   }else if(queryEstado==='borrados'){
    filtered=filtered.filter(s=>s.eliminado_por_usuario);
   }

   const data=filtered.map(item=>({
    ...item,
    usuario_nombre:userMap.get(item.usuario_id)?.nombre||`Usuario #${item.usuario_id}`,
    usuario_login:userMap.get(item.usuario_id)?.usuario||'',
    usuario_cargo:userMap.get(item.usuario_id)?.cargo||''
   }));

   return{
    status:'success',
    data,
    stats:{
     total_todos,
     total_mes_todos,
     total_activos,
     total_borrados_usuario,
     mes_actual:NOMBRES_MESES[currentMonth],
     anio_actual:currentYear,
     usuarios:usuarios_stats
    }
   };
  }

  const items=await this.db.historial.findMany({
   where:{
    usuario_id:req.identity.id,
    eliminado_por_usuario:false
   },
   orderBy:{creado_en:'desc'}
  });

  const mesItems=items.filter(s=>s.creado_en>=startOfMonth&&s.creado_en<=endOfMonth);

  return{
   status:'success',
   data:items,
   stats:{
    total_usuario:items.length,
    total_mes_usuario:mesItems.length,
    mes_actual:NOMBRES_MESES[currentMonth],
    anio_actual:currentYear
   }
  };
 }

 @Post('guardar')
 async save(@Body()body:unknown,@Req()req:AuthRequest){
  const data=z.object({
   nombre:z.string().max(150),
   tipo:z.string().max(50),
   datos_json:z.string().max(1000000)
  }).parse(body);
  JSON.parse(data.datos_json);
  await this.db.historial.create({
   data:{
    usuario_id:req.identity.id,
    nombre_escenario:data.nombre,
    tipo:data.tipo,
    datos_json:data.datos_json,
    eliminado_por_usuario:false
   }
  });
  return{status:'success',message:'Escenario guardado en el historial.'};
 }

 @Post('eliminar')
 async remove(@Body()body:unknown,@Req()req:AuthRequest){
  const{id}=z.object({id:z.coerce.number().int().positive()}).parse(body);
  const isAdmin=req.identity.cargo==='Administrador';
  if(isAdmin){
   await this.db.historial.deleteMany({
    where:{id}
   });
  }else{
   await this.db.historial.updateMany({
    where:{id,usuario_id:req.identity.id},
    data:{eliminado_por_usuario:true,eliminado_en:new Date()}
   });
  }
  return{status:'success',message:'Escenario eliminado.'};
 }

 @Post('limpiar')
 async clear(@Req()req:AuthRequest){
  const isAdmin=req.identity.cargo==='Administrador';
  if(isAdmin){
   await this.db.historial.deleteMany({
    where:{usuario_id:req.identity.id}
   });
   return{status:'success',message:'Se han limpiado sus escenarios personales. El historial de los demás usuarios permanece guardado.'};
  }
  await this.db.historial.updateMany({
   where:{usuario_id:req.identity.id,eliminado_por_usuario:false},
   data:{eliminado_por_usuario:true,eliminado_en:new Date()}
  });
  return{status:'success',message:'Historial limpiado correctamente.'};
 }

 @Post('restaurar')
 async restore(@Body()body:unknown,@Req()req:AuthRequest){
  if(req.identity.cargo!=='Administrador')throw new ForbiddenException('No autorizado');
  const{id}=z.object({id:z.coerce.number().int().positive()}).parse(body);
  await this.db.historial.updateMany({
   where:{id},
   data:{eliminado_por_usuario:false,eliminado_en:null}
  });
  return{status:'success',message:'Escenario restaurado exitosamente para el usuario.'};
 }
}

@Module({imports:[AuthModule],controllers:[HistorialController]})
export class HistorialModule{}

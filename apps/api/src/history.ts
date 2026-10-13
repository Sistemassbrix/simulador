import {Controller,Get,Post,Body,Req,Inject,Module,UseGuards} from '@nestjs/common';
import {z} from 'zod';
import {Database} from './db';
import {AuthModule,SessionGuard,AuthRequest} from './auth';
@Controller('historial') @UseGuards(SessionGuard)
export class HistorialController{
 constructor(@Inject(Database)private db:Database){}
 @Get()async list(@Req()req:AuthRequest){return{status:'success',data:await this.db.historial.findMany({where:{usuario_id:req.identity.id},orderBy:{creado_en:'desc'}})};}
 @Post('guardar')async save(@Body()body:unknown,@Req()req:AuthRequest){const data=z.object({nombre:z.string().max(150),tipo:z.string().max(50),datos_json:z.string().max(1000000)}).parse(body);JSON.parse(data.datos_json);await this.db.historial.create({data:{usuario_id:req.identity.id,nombre_escenario:data.nombre,tipo:data.tipo,datos_json:data.datos_json}});return{status:'success',message:'Escenario guardado en el historial.'};}
 @Post('eliminar')async remove(@Body()body:unknown,@Req()req:AuthRequest){const{id}=z.object({id:z.coerce.number().int().positive()}).parse(body);await this.db.historial.deleteMany({where:{id,usuario_id:req.identity.id}});return{status:'success',message:'Escenario eliminado.'};}
 @Post('limpiar')async clear(@Req()req:AuthRequest){await this.db.historial.deleteMany({where:{usuario_id:req.identity.id}});return{status:'success',message:'Historial limpiado correctamente.'};}
}
@Module({imports:[AuthModule],controllers:[HistorialController]})export class HistorialModule{}

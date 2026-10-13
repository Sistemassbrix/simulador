import {Controller,Get,Post,Param,Body,Req,Inject,Module,UseGuards,BadRequestException} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {Database} from './db';
import {AuthModule,SessionGuard,AdminGuard,AuthRequest,publicUser,userInput} from './auth';
const idValue=(v:unknown)=>z.coerce.number().int().positive().parse(v);
@Controller('usuarios') @UseGuards(SessionGuard)
export class UsuariosController {
 constructor(@Inject(Database)private db:Database){}
 @Get()async list(){return{status:'success',data:await this.db.usuario.findMany({select:publicUser,orderBy:{id:'desc'}})};}
 @Get(':id')async get(@Param('id')id:string){return{status:'success',data:await this.db.usuario.findUniqueOrThrow({where:{id:idValue(id)},select:publicUser})};}
 @Post('guardar') @UseGuards(AdminGuard)async save(@Body()body:unknown){const input=userInput.parse(body);const {id,password,...data}=input;
   if(!id&&!password)throw new BadRequestException('La contraseña es obligatoria para un nuevo usuario');
   const duplicate=await this.db.usuario.findFirst({where:{OR:[{usuario:data.usuario},{correo:data.correo},{cedula:data.cedula}],...(id?{id:{not:id}}:{})}});
   if(duplicate)return{status:'error',message:id?'Usuario, correo o cédula ya están en uso por otro usuario':'Usuario, correo o cédula ya están en uso'};
   const update={...data,...(password?{contrasena:await bcrypt.hash(password,10)}:{})};
   if(id)await this.db.usuario.update({where:{id},data:update});else await this.db.usuario.create({data:{...update,contrasena:update.contrasena!}});
   return{status:'success',message:id?'Usuario actualizado correctamente':'Usuario creado correctamente'};
 }
 @Post('eliminar') @UseGuards(AdminGuard)async remove(@Body()body:any,@Req()req:AuthRequest){const id=idValue(body.id);if(id===req.identity.id)return{status:'error',message:'No puedes eliminar tu propia cuenta mientras estás logueado'};await this.db.usuario.delete({where:{id}});return{status:'success',message:'Usuario eliminado correctamente'};}
}
const nameInput=z.object({id:z.coerce.number().int().positive().optional(),nombre:z.string().trim().min(1).max(100)});
@Controller('granos') @UseGuards(SessionGuard)
export class GranosController {
 constructor(@Inject(Database)private db:Database){}
 @Get()async list(){return{status:'success',data:await this.db.grano.findMany({orderBy:{id:'desc'}})};}
 @Get(':id')async get(@Param('id')id:string){return{status:'success',data:await this.db.grano.findUniqueOrThrow({where:{id:idValue(id)}})};}
 @Post('guardar') @UseGuards(AdminGuard)async save(@Body()body:unknown){const{id,...data}=nameInput.parse(body);const dup=await this.db.grano.findFirst({where:{nombre:data.nombre,...(id?{id:{not:id}}:{})}});if(dup)return{status:'error',message:id?'El nombre ya está en uso por otro grano':'El grano ya existe'};if(id)await this.db.grano.update({where:{id},data});else await this.db.grano.create({data});return{status:'success',message:id?'Grano actualizado correctamente':'Grano creado correctamente'};}
 @Post('eliminar') @UseGuards(AdminGuard)async remove(@Body()body:any){await this.db.grano.delete({where:{id:idValue(body.id)}});return{status:'success',message:'Grano eliminado correctamente'};}
}
@Controller('maquinaria') @UseGuards(SessionGuard)
export class MaquinariaController {
 constructor(@Inject(Database)private db:Database){}
 @Get()async list(){return{status:'success',data:await this.db.maquinaria.findMany({orderBy:{id:'asc'}})};}
 @Get(':id')async get(@Param('id')id:string){return{status:'success',data:await this.db.maquinaria.findUniqueOrThrow({where:{id:idValue(id)}})};}
 @Post('guardar') @UseGuards(AdminGuard)async save(@Body()body:unknown){const{id,...data}=nameInput.extend({cuerpo:z.string().trim().max(10).default(''),caudal_aire:z.coerce.number().finite().default(0),holding:z.coerce.number().finite().default(0)}).parse(body);const dup=await this.db.maquinaria.findFirst({where:{nombre:data.nombre,...(id?{id:{not:id}}:{})}});if(dup)return{status:'error',message:id?'El nombre ya está en uso por otra maquinaria':'La maquinaria ya existe'};if(id)await this.db.maquinaria.update({where:{id},data});else await this.db.maquinaria.create({data});return{status:'success',message:id?'Maquinaria actualizada correctamente':'Maquinaria creada correctamente'};}
 @Post('eliminar') @UseGuards(AdminGuard)async remove(@Body()body:any){await this.db.maquinaria.delete({where:{id:idValue(body.id)}});return{status:'success',message:'Maquinaria eliminada correctamente'};}
}
@Module({imports:[AuthModule],controllers:[UsuariosController]})export class UsuariosModule{}
@Module({imports:[AuthModule],controllers:[GranosController]})export class GranosModule{}
@Module({imports:[AuthModule],controllers:[MaquinariaController]})export class MaquinariaModule{}

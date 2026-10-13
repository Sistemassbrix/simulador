import {Body, Controller, Get, Post, Req, Res, Injectable, Inject, Module, UnauthorizedException, ForbiddenException, CanActivate, ExecutionContext, UseGuards, BadRequestException} from '@nestjs/common';
import {Request,Response} from 'express';
import {randomBytes,createHash,timingSafeEqual} from 'node:crypto';
import bcrypt from 'bcryptjs';
import {z} from 'zod';
import {Database} from './db';
export type Identity={id:number;nombre:string;usuario:string;cargo:string|null};
export type AuthRequest=Request & {identity:Identity;sessionCsrf:string};
export const publicUser={id:true,nombre:true,usuario:true,correo:true,cedula:true,cargo:true,creado_en:true} as const;
const digest=(v:string)=>createHash('sha256').update(v).digest('hex');
export function verifyPassword(password:string,hash:string){return bcrypt.compare(password,hash.replace(/^\$2y\$/,'$2b$'));}
export const userInput=z.object({id:z.coerce.number().int().positive().optional(),nombre:z.string().trim().min(1).max(100),usuario:z.string().trim().min(1).max(50),correo:z.string().trim().min(1).max(100),cedula:z.string().trim().min(1).max(20),cargo:z.string().trim().min(1).max(255),password:z.string().max(1000).optional()});
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(Database) private db:Database){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest<AuthRequest>();
    const token=req.cookies?.simulador_session;
    if(typeof token!=='string')throw new UnauthorizedException('No autorizado');
    const session=await this.db.sesion.findUnique({where:{token_hash:digest(token)},include:{usuario:true}});
    if(!session||session.vence_en<new Date())throw new UnauthorizedException('No autorizado');
    // PHP session.gc_maxlifetime was 1440s and its file timestamp refreshed on access.
    await this.db.sesion.update({where:{token_hash:session.token_hash},data:{vence_en:new Date(Date.now()+Number(process.env.SESSION_HOURS||0.4)*3600000)}});
    req.identity={id:session.usuario.id,nombre:session.usuario.nombre,usuario:session.usuario.usuario,cargo:session.usuario.cargo};
    req.sessionCsrf=session.csrf;
    if(!['GET','HEAD','OPTIONS'].includes(req.method)) {
      const supplied=req.get('x-csrf-token');
      if(!supplied||Buffer.byteLength(supplied)!==Buffer.byteLength(session.csrf)||!timingSafeEqual(Buffer.from(supplied),Buffer.from(session.csrf)))throw new ForbiddenException('Petición inválida');
      const origin=req.get('origin');
      if(origin && new URL(origin).host!==req.get('host'))throw new ForbiddenException('Petición inválida');
    }
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context:ExecutionContext){if(context.switchToHttp().getRequest<AuthRequest>().identity?.cargo!=='Administrador')throw new ForbiddenException('No autorizado');return true;}
}
@Controller('auth')
export class AuthController {
  constructor(@Inject(Database) private db:Database){}
  private preflight(req:Request){const csrf=req.cookies?.simulador_pre_csrf;const header=req.get('x-csrf-token');if(!csrf||csrf!==header)throw new ForbiddenException('Petición inválida');const origin=req.get('origin');if(origin&&new URL(origin).host!==req.get('host'))throw new ForbiddenException('Petición inválida');}
  @Get('csrf') csrf(@Res({passthrough:true})res:Response){const token=randomBytes(32).toString('hex');res.cookie('simulador_pre_csrf',token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',path:'/api',maxAge:3600000});return{status:'success',csrf:token};}
  @Post('login') async login(@Body()body:unknown,@Req()req:Request,@Res({passthrough:true})res:Response){
    this.preflight(req);const input=z.object({usuario:z.string().trim().min(1).max(100),password:z.string().min(1).max(1000)}).parse(body);
    const user=await this.db.usuario.findFirst({where:{OR:[{usuario:input.usuario},{cedula:input.usuario}]}});
    if(!user||!await verifyPassword(input.password,user.contrasena))return{status:'error',message:'Credenciales inválidas. Verifique sus datos.'};
    const token=randomBytes(32).toString('hex'),csrf=randomBytes(32).toString('hex');
    const duration=Number(process.env.SESSION_HOURS||0.4)*3600000;
    await this.db.sesion.deleteMany({where:{vence_en:{lt:new Date()}}});
    await this.db.sesion.create({data:{token_hash:digest(token),usuario_id:user.id,csrf,vence_en:new Date(Date.now()+duration)}});
    res.cookie('simulador_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.COOKIE_SECURE==='true',path:'/api'});
    return{status:'success',message:'Ingresando al panel...',csrf,data:{id:user.id,nombre:user.nombre,usuario:user.usuario,cargo:user.cargo}};
  }
  @Post('register') async register(@Body()body:unknown,@Req()req:Request){
    this.preflight(req);const input=userInput.omit({id:true}).extend({password:z.string().min(1).max(1000)}).parse(body);
    if(await this.db.usuario.findFirst({where:{OR:[{usuario:input.usuario},{correo:input.correo},{cedula:input.cedula}]}}))return{status:'error',message:'El usuario, correo o cédula ya están registrados.'};
    const{password,...data}=input;await this.db.usuario.create({data:{...data,contrasena:await bcrypt.hash(password,10)}});
    return{status:'success',message:'Registro exitoso. Ahora puede iniciar sesión.'};
  }
  @Get('me') @UseGuards(SessionGuard) me(@Req()req:AuthRequest){return{status:'success',data:req.identity,csrf:req.sessionCsrf};}
  @Post('logout') @UseGuards(SessionGuard) async logout(@Req()req:AuthRequest,@Res({passthrough:true})res:Response){await this.db.sesion.deleteMany({where:{token_hash:digest(req.cookies.simulador_session)}});res.clearCookie('simulador_session',{path:'/api'});return{status:'success'};}
}
@Module({controllers:[AuthController],providers:[SessionGuard,AdminGuard],exports:[SessionGuard,AdminGuard]})
export class AuthModule {}

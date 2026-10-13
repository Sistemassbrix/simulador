import 'reflect-metadata';
import {NestFactory} from '@nestjs/core';
import {Module,Catch,ExceptionFilter,ArgumentsHost,HttpException} from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import {z} from 'zod';
import {DatabaseModule} from './db';
import {AuthModule} from './auth';
import {UsuariosModule,GranosModule,MaquinariaModule} from './catalogs';
import {HistorialModule} from './history';
import {SimulationModule} from './simulation';
import {ClimateModule} from './climate';
@Catch()class Errors implements ExceptionFilter{catch(error:any,host:ArgumentsHost){const res=host.switchToHttp().getResponse();const status=error instanceof HttpException?error.getStatus():error instanceof z.ZodError||error instanceof SyntaxError?400:error.code==='P2002'?409:error.code==='P2025'?404:500;res.status(status).json({status:'error',message:status===500?'Error al procesar la petición.':error instanceof z.ZodError?'Los campos principales son obligatorios o inválidos':status===409?'El registro ya existe':error.message});if(status===500)console.error(error);}}
@Module({imports:[DatabaseModule,AuthModule,UsuariosModule,GranosModule,MaquinariaModule,HistorialModule,SimulationModule,ClimateModule]})class AppModule{}
async function main(){const app=await NestFactory.create(AppModule);app.setGlobalPrefix('api');app.use(helmet());app.use(cookieParser());app.useGlobalFilters(new Errors());app.enableShutdownHooks();await app.listen(Number(process.env.PORT||3082),'0.0.0.0');}
main().catch(e=>{console.error(e);process.exit(1);});

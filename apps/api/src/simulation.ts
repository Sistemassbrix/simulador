import {Controller,Post,Body,Get,Module,UseGuards} from '@nestjs/common';
import {z} from 'zod';
import {AuthModule,SessionGuard} from './auth';
import {calculateDrying,datosGranos} from './engine/drying';
import {calculateLegacy} from './engine/legacy';
const numeric=z.union([z.number(),z.string()]).transform(v=>Number(v)).refine(Number.isFinite,'Número inválido');
export const dryingInput=z.object({tipoGrano:z.enum(['arroz','maiz','trigo','sorgo','cebada','soya']),tempLimiteGrano:numeric,densidadAparente:numeric,humedadInicial:numeric,humedadObjetivo:numeric,metaSecado:numeric,velocidadAire:numeric,tempAmbiente:numeric,hrAmbiente:numeric,altitud:numeric,eficienciaTermica:numeric,mode:z.enum(['dashboard','recirculacion']).default('dashboard'),machine:z.enum(['ax','axl','menor']).default('ax'),locale:z.string().max(50).regex(/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/).default('en-US')});
@Controller('simulacion') @UseGuards(SessionGuard)
export class SimulationController {
 @Get('granos')properties(){return{status:'success',data:datosGranos};}
 @Post()calculate(@Body()body:unknown){return{status:'success',data:calculateDrying(dryingInput.parse(body))};}
 @Post('procesar')legacy(@Body()body:unknown){return{status:'success',resultados:calculateLegacy(z.record(z.string(),z.union([z.string(),z.number()])).parse(body))};}
}
@Module({imports:[AuthModule],controllers:[SimulationController]})export class SimulationModule{}

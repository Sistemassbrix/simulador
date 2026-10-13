import {Controller,Get,Post,Query,Body,Module,UseGuards,BadGatewayException} from '@nestjs/common';
import {z} from 'zod';
import {AuthModule,SessionGuard} from './auth';
import {calculateHarvest} from './engine/harvest';
import {procesarYRenderizarPerfiles} from './engine/profiles';
const coordinateNumber=(min:number,max:number)=>z.preprocess(value=>typeof value==='string'&&!value.trim()?undefined:value,z.coerce.number().min(min).max(max));
const coordinates=z.object({latitud:coordinateNumber(-90,90),longitud:coordinateNumber(-180,180)});
export const harvestInput=coordinates.extend({altitud_clima:z.coerce.number().finite(),anios_historicos:z.coerce.number().int().min(1).max(10),months:z.array(z.number().int().min(1).max(12)).max(12),buscar_ciudad:z.string().max(250),franja:z.object({tipo:z.string(),nombre:z.string(),horaInicio:z.number().int().min(0).max(23),horaFin:z.number().int().min(0).max(23)}), 'filtro-tabla-dia':z.string().max(100).default(''),'filtro-tabla-mes':z.string().max(10).default('todos')});
const archiveCache=new Map<string,{at:number,data:any}>();
function harvestValues(body:unknown){const p=harvestInput.parse(body);if(!p.months.length)p.months=Array.from({length:12},(_,i)=>i+1);return p;}
export async function weatherFetch(url:string,timeout=12000):Promise<any>{try{const response=await fetch(url,{signal:AbortSignal.timeout(timeout)});if(!response.ok)throw new Error('HTTP '+response.status);return await response.json();}catch{throw new BadGatewayException('No se pudo conectar con la API de tiempo real de Open-Meteo.');}}
@Controller('clima') @UseGuards(SessionGuard)
export class ClimateController {
 @Get('ciudades')async cities(@Query('q')q:string,@Query('contexto')contexto?:string){const query=z.string().trim().min(1).max(150).parse(q);return{status:'success',data:await weatherFetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(query)+'&count='+(contexto==='cosecha'?6:5)+'&language=es&format=json')};}
 @Post('actual')async current(@Body()body:unknown){const p=coordinates.parse(body);return{status:'success',data:await weatherFetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitud}&longitude=${p.longitud}&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code&timezone=auto`)};}
 @Post('cosecha/inicial')initial(@Body()body:unknown){const result=calculateHarvest(harvestValues(body));delete (result.details as any).raw;return{status:'success',data:result,synthetic:true};}
 @Post('cosecha')async harvest(@Body()body:unknown){const p=harvestValues(body);const start=2025-p.anios_historicos+1;const url=`https://archive-api.open-meteo.com/v1/archive?latitude=${p.latitud}&longitude=${p.longitud}&start_date=${start}-01-01&end_date=2025-12-31&hourly=temperature_2m,relative_humidity_2m,direct_normal_irradiance&daily=temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;let data:any,synthetic=false;
  try{const cached=archiveCache.get(url);if(cached&&Date.now()-cached.at<3600000)data=cached.data;else{data=await weatherFetch(url);archiveCache.set(url,{at:Date.now(),data});}if(!data?.hourly?.time?.length)synthetic=true;}catch{synthetic=true;}
  const result=calculateHarvest(p,synthetic?undefined:data);delete (result.details as any).raw;return{status:'success',data:result,synthetic};
 }
 @Post('perfiles')async profiles(@Body()body:unknown){const p=coordinates.parse(body);const forecast=await weatherFetch(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitud}&longitude=${p.longitud}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m,relative_humidity_2m&timezone=auto`);let archive=null;try{archive=await weatherFetch(`https://archive-api.open-meteo.com/v1/archive?latitude=${p.latitud}&longitude=${p.longitud}&start_date=2025-01-01&end_date=2025-12-31&daily=temperature_2m_mean,relative_humidity_2m_mean&timezone=auto`);}catch{}return{status:'success',data:procesarYRenderizarPerfiles(forecast,archive)};}
}
@Module({imports:[AuthModule],controllers:[ClimateController]})export class ClimateModule{}

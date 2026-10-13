import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {spawnSync} from 'node:child_process';
const php=[];
for(const grano of ['Arroz Paddy (Largo)','Maíz','Maíz Blanco','Soya','Trigo','Sorgo','Cebada','Frijol'])for(const eficiencia of ['85','.5','50','0','-1','0,5'])php.push({tipo_grano:grano,eficiencia});
php.push({});php.push({humedad_inicial:13,humedad_objetivo:13,meta_procesamiento:0});php.push({humedad_inicial:12,humedad_objetivo:14});
const script=`<?php require '/var/www/html/models/Simulador.php'; $model=new Simulador(); $inputs=json_decode(base64_decode('${Buffer.from(JSON.stringify(php)).toString('base64')}'),true); $result=[];foreach($inputs as $input)$result[]=['input'=>$input,'resultados'=>$model->calcular($input)];echo json_encode($result,JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR);`;
const result=spawnSync('docker',['exec','-i','simulador-app','php'],{input:script,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);fs.writeFileSync('tests/fixtures/legacy-php.json',result.stdout);
// Execute original harvest declarations as JavaScript, independent of the TS translation.
const original=fs.readFileSync('reference/assets/js/cosecha.js','utf8');const ast=ts.createSourceFile('original.js',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);const fns=[];function collect(n){if(ts.isFunctionDeclaration(n))fns.push(n.getText(ast));ts.forEachChild(n,collect);}collect(ast);
const names=['horaPerteneceAFranja','procesarDatosHistoricosCompletos','generarDatosSinteticosAvanzados','ajustarWeibull','aproximarGamma','recalcularAnalisisFranja','actualizarPrediccionAptitud','renderizarTablaHoraria','renderizarTablaDiaria','renderizarTodosLosGraficos','destruirGraficoSeguro','renderizarGraficoCicloHorarioInstance','renderizarGraficoWeibullTempInstance','renderizarGraficoWeibullHrInstance','renderizarGraficoSerieTemporalInstance'];
const fnSource=fns.filter(s=>names.includes(s.match(/^function (\w+)/)?.[1])).join('\n');
const vars=original.slice(original.indexOf('    const nombresMeses'),original.indexOf('    // Ciudades agrícolas sugeridas'));
const outputs=[];
const realWeather={hourly:{time:[],temperature_2m:[],relative_humidity_2m:[],direct_normal_irradiance:[]}};
for(const month of [1,6])for(let day=1;day<=5;day++)for(let hour=0;hour<24;hour++){realWeather.hourly.time.push(`2025-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T${String(hour).padStart(2,'0')}:00`);realWeather.hourly.temperature_2m.push(20+month+Math.sin(hour)*5);realWeather.hourly.relative_humidity_2m.push(65+Math.cos(hour)*15);realWeather.hourly.direct_normal_irradiance.push(hour>=6&&hour<=18?600:0);}
for(const months of [[1,2,3,4,5,6,7,8,9,10,11,12],[1,6],[]])for(const range of [[8,18],[19,7],[0,23]])for(const weather of [undefined,realWeather]){
 const input={buscar_ciudad:'Acarigua, Venezuela',latitud:9.5545,longitud:-69.1956,altitud_clima:195,anios_historicos:5,months,franja:{tipo:'prueba',nombre:'prueba',horaInicio:range[0],horaFin:range[1]},'filtro-tabla-dia':'','filtro-tabla-mes':'todos'};
 const cells={},charts={};const cell=id=>{if(!cells[id])cells[id]={value:'',innerHTML:'',style:{}};cells[id].style??={};cells[id].getContext=()=>({id});return cells[id];};for(const[k,v]of Object.entries(input))cells[k]={value:String(v)};
 const $=selector=>{const id=selector.slice(1),c=cell(id);const chain={length:1,val:()=>c.value,text:v=>{c.innerText=String(v);return chain;},html:v=>{c.innerHTML=String(v);return chain;},empty:()=>{c.innerHTML='';return chain;},css:(k,v)=>{if(typeof k==='string')c.style[k]=v;else Object.assign(c.style,k);return chain;},removeClass:s=>{c.removeClass=(c.removeClass||'')+' '+s;return chain;},addClass:s=>{c.addClass=(c.addClass||'')+' '+s;return chain;},closest:()=>$('#'+id+'::closest')};return chain;};
 class Chart{constructor(target,config){charts[target.id]=config;}static getChart(){return null;}}
 const context=vm.createContext({$,document:{getElementById:cell},Chart,console,input,weather});
 vm.runInContext(vars+'\n'+fnSource+`\nfranjaActual=input.franja;if(weather)procesarDatosHistoricosCompletos(weather,2021,2025,input.months,input.latitud,input.longitud,input.altitud_clima);else generarDatosSinteticosAvanzados(input.latitud,input.longitud,input.altitud_clima,2021,2025,input.months);globalThis.result={details:{days:datosClimaticosGlobales,hours:perfilHorario24h,statistics:estadisticasDiseno,raw:datosHorariosGlobales}};`,context);
 outputs.push({input,weather,result:JSON.parse(JSON.stringify({cells,charts,...context.result}))});
}
fs.writeFileSync('tests/fixtures/harvest-original.json',JSON.stringify(outputs,null,2));console.log(`Original PHP: ${php.length} cases; harvest JS: ${outputs.length} cases.`);

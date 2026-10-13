import {chromium} from '@playwright/test';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const folder='private/baseline';fs.mkdirSync(folder,{recursive:true});
// An ephemeral existing-user PHP session for read-only browser inspection.
const php=`<?php require '/var/www/html/config/database.php'; $db=(new Database())->getConnection(); $u=$db->query("SELECT id,nombre,cargo FROM usuarios WHERE cargo='Administrador' ORDER BY id LIMIT 1")->fetch(); session_start(); $_SESSION['usuario_id']=$u['id']; $_SESSION['usuario_nombre']=$u['nombre']; $_SESSION['usuario_cargo']=$u['cargo']; echo session_id();`;
const result=spawnSync('docker',['exec','-i','--user','www-data','simulador-app','php'],{input:php,encoding:'utf8'});if(result.status!==0)throw Error(result.stderr);const session=result.stdout.trim();
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});const page=await context.newPage();
page.on('pageerror',e=>fs.appendFileSync(folder+'/browser-errors.log',String(e)+'\n'));
await page.goto('http://app.simulador.local/');await page.screenshot({path:folder+'/auth-desktop.png',fullPage:true});
await context.addCookies([{name:'PHPSESSID',value:session,domain:'app.simulador.local',path:'/'}]);
for(const screen of ['dashboard','recirculacion','cosecha','usuario','grano','maquinaria','historial']){await page.goto('http://app.simulador.local/index.php?controller='+screen+'&action=index');await page.waitForTimeout(screen==='cosecha'?2000:700);await page.screenshot({path:`${folder}/${screen}-desktop.png`,fullPage:true});fs.writeFileSync(`${folder}/${screen}.html`,await page.content());await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${folder}/${screen}-mobile.png`,fullPage:true});await page.setViewportSize({width:1440,height:1000});}
await page.goto('http://app.simulador.local/index.php?controller=dashboard&action=index');await page.waitForFunction(()=>document.querySelector('#metricAgua').innerText.includes('103.4'));
const cases=[];
const climateCases=[{humedadInicial:22,humedadObjetivo:13,metaSecado:250,tempAmbiente:25,hrAmbiente:85,altitud:15,velocidadAire:15},{humedadInicial:24,humedadObjetivo:14,metaSecado:5,tempAmbiente:28.5,hrAmbiente:65,altitud:500,velocidadAire:10},{humedadInicial:16,humedadObjetivo:13,metaSecado:100,tempAmbiente:10,hrAmbiente:1,altitud:2500,velocidadAire:1},{humedadInicial:35,humedadObjetivo:8,metaSecado:1000,tempAmbiente:40,hrAmbiente:99,altitud:0,velocidadAire:25},{humedadInicial:13,humedadObjetivo:13,metaSecado:0,tempAmbiente:25,hrAmbiente:85,altitud:15,velocidadAire:0},{humedadInicial:12,humedadObjetivo:14,metaSecado:100,tempAmbiente:25,hrAmbiente:85,altitud:15,velocidadAire:15},{humedadInicial:25,humedadObjetivo:100,metaSecado:100,tempAmbiente:25,hrAmbiente:85,altitud:15,velocidadAire:15}];
for(const grain of ['arroz','maiz','trigo','sorgo','cebada','soya'])for(const inputs of climateCases)for(const machine of ['ax','axl','menor']){
 const result=await page.evaluate(({grain,inputs,machine})=>{document.getElementById('tipoGrano').value=grain;actualizarValoresGrano();for(const[k,v]of Object.entries(inputs))document.getElementById(k).value=String(v);seleccionarMaquinaReal(machine);const cells={};document.querySelectorAll('[id]').forEach(el=>{if(el.id.startsWith('metric')||el.id.startsWith('realSel')||el.id.startsWith('maq')||el.id==='tituloSimulacionReal')cells[el.id]=el.innerText;});return{input:{...inputs,tipoGrano:grain,tempLimiteGrano:document.getElementById('tempLimiteGrano').value,densidadAparente:document.getElementById('densidadAparente').value,eficienciaTermica:document.getElementById('eficienciaTermica').value,machine,mode:'dashboard'},cells,rows:document.querySelector('#tablaPasos tbody').innerHTML,chart:chartVitreaInstance.config._config};},{grain,inputs,machine});cases.push(result);
}
fs.writeFileSync('tests/fixtures/drying-browser.json',JSON.stringify(cases,null,2));
// Keep only cookie in the private evidence directory. Expire it immediately after inspection.
spawnSync('docker',['exec','-i','--user','www-data','simulador-app','php'],{input:`<?php session_id('${session}'); session_start(); session_destroy();`,encoding:'utf8'});
await browser.close();console.log(`Original: ${cases.length} reference cases and desktop/mobile screenshots captured.`);

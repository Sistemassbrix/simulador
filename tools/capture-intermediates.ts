import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {OutputBuffer} from '../apps/api/src/engine/output';
const original=fs.readFileSync(`${process.env.REFERENCE_ROOT||'reference'}/assets/js/simulador.js`,'utf8');
const ast=ts.createSourceFile('original.js',original,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['calcularPsicrometria','calcularHumedadEquilibrio','calcularHrCalentado','calcularTemperaturaBulboHumedo','recomendarEquipo','ejecutarSimulacion','dibujarCurvaVitrea','actualizarNumerosAdimensionales'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name!.text)).map(n=>n.getText(ast)).join('\n');
const removalDiagnostic=original.includes('let remocion_por_pase')?'remocion_por_pase':'drops';
const instrumented=functions.replace('dibujarCurvaVitrea(grano, pasos);',`dibujarCurvaVitrea(grano, pasos);capture({psico,Me,aguaPorTon,aguaTotalDiaria,prodSecaDiaria,energiaRealMJ,litrosDiesel,numSteps,${removalDiagnostic},caudalTotalCFM,sumaTiemposCalor,tiempoTotalMinutos,pasos});`);
const constants=original.slice(0,original.indexOf('let chartVitreaInstance'))+'\n'+original.slice(original.indexOf('const modelosSecadoras'),original.indexOf('function recomendarEquipo'));
const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/drying-browser.json','utf8')),result=[];
for(const fixture of fixtures){const output=new OutputBuffer(fixture.input);let intermediates:any;const context=vm.createContext({console,capture:(value:any)=>intermediates=value,document:{getElementById:(id:string)=>output.cell(id),querySelector:(id:string)=>output.cell(id)},window:{location:{search:fixture.input.mode==='recirculacion'?'controller=recirculacion':''}},$:(id:string)=>output.select(id),Chart:output.plotClass(),input:fixture.input});vm.runInContext(constants+'\nlet chartVitreaInstance=null;let maquinaSeleccionada=input.machine;\n'+instrumented+'\nejecutarSimulacion();',context);if(!intermediates)throw Error('Sin captura');result.push({input:fixture.input,intermediates});}
fs.writeFileSync('tests/fixtures/intermediates-original.json',JSON.stringify(result,(_key,value)=>typeof value==='number'&&!Number.isFinite(value)?{$nonfinite:String(value)}:value,2));console.log('Intermedios originales: '+result.length+' casos');

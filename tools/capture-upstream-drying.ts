import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {OutputBuffer} from '../apps/api/src/engine/output';

// Execute the GitHub JavaScript directly; never call the translated TS engine.
const root=process.env.REFERENCE_ROOT||'private/upstream-simulad0';
const source=fs.readFileSync(root+'/assets/js/simulador.js','utf8');
const ast=ts.createSourceFile('upstream.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const names=['calcularPsicrometria','calcularHumedadEquilibrio','calcularHrCalentado','calcularTemperaturaBulboHumedo','recomendarEquipo','ejecutarSimulacion','dibujarCurvaVitrea','actualizarNumerosAdimensionales'];
const functions=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&names.includes(n.name!.text)).map(n=>n.getText(ast)).join('\n').replace('function recomendarEquipo(caudalRequerido) {','function recomendarEquipo(caudalRequerido) { globalThis.requestedFlow=caudalRequerido;');
const constants=source.slice(0,source.indexOf('let chartVitreaInstance'))+'\n'+source.slice(source.indexOf('const modelosSecadoras'),source.indexOf('function recomendarEquipo'));
function execute(input:any){const output=new OutputBuffer(input);const context=vm.createContext({console,document:{getElementById:(id:string)=>output.cell(id),querySelector:(id:string)=>output.cell(id)},window:{location:{search:input.mode==='recirculacion'?'controller=recirculacion':''}},$:(id:string)=>output.select(id),Chart:output.plotClass(),input});vm.runInContext("const formatNumber=Number.prototype.toLocaleString;Number.prototype.toLocaleString=function(locale,options){return formatNumber.call(this,locale||input.locale||'en-US',options);};\n"+constants+'\nlet chartVitreaInstance=null;let maquinaSeleccionada=input.machine;\n'+functions+'\nejecutarSimulacion();',context);return{context,output};}
const base=JSON.parse(fs.readFileSync('tests/fixtures/drying-inputs.json','utf8')).map((input:any)=>({input}));
const inputs=base.flatMap((f:any)=>['dashboard','recirculacion'].map(mode=>({...f.input,mode})));
const reference=execute(base[0].input);
const machines=vm.runInContext('modelosSecadoras',reference.context);
const baseFlow=reference.context.requestedFlow;
for(const machine of machines)for(const offset of [-1,1])for(const family of ['ax','axl','menor'])inputs.push({...base[0].input,machine:family,metaSecado:Number(base[0].input.metaSecado)*(machine.caudal+offset)/baseFlow});
const fixtures=inputs.map((input:any)=>{const{output}=execute(input);return{input,cells:Object.fromEntries(Object.entries(output.cells).filter(([id,c])=>(id.startsWith('metric')||id.startsWith('realSel')||id.startsWith('maq')||id==='tituloSimulacionReal')&&c.innerText!==undefined).map(([id,c])=>[id,c.innerText])),rows:output.cells['#tablaPasos tbody'].innerHTML,realRows:output.cells['#tablaPasosReal tbody'].innerHTML,chart:output.charts.chartTransicionVitrea};});
fs.writeFileSync('tests/fixtures/drying-browser.json',JSON.stringify(fixtures,null,2));
fs.writeFileSync('tests/fixtures/upstream-source.json',JSON.stringify({repository:'https://github.com/Luisfer112/simulad0',commit:'20318d6b2c03c579af0a242662afc6884b2f722e',referenceMethod:'Unmodified source function declarations executed in JavaScript VM with formatting-only DOM adapter',cases:fixtures.length,models:machines.length,includesBothModes:true,includesModelBoundaries:true},null,2));
console.log('Referencias independientes del commit: '+fixtures.length+' casos, '+machines.length+' modelos');

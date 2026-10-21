import React,{ReactNode} from 'react';
import parse,{attributesToProps,domToReact,Element,DOMNode,HTMLReactParserOptions} from 'html-react-parser';
import {Dialog} from './components/ui/dialog';
import {Button} from './components/ui/button';
import {Chart} from './components/Chart';
export type TemplateContext={focusCity:()=>void;busy:boolean;values:Record<string,string>;setValue:(id:string,v:string)=>void;cells:Record<string,any>;charts:Record<string,any>;chartDetails?:any;action:(action:string,attrs:Record<string,string>)=>void;submit:(id:string,form:HTMLFormElement)=>void;modal:string|null;close:()=>void;admin:boolean;auth:boolean;tabs:Set<string>;months:number[];slot:string;grid:boolean;custom:(node:Element)=>ReactNode|undefined};
export function Template({html,context}:{html:string;context:TemplateContext}){
 const options:HTMLReactParserOptions={replace(node){
  if(!(node instanceof Element))return;const attrs=node.attribs,id=attrs.id||'',tag=node.name,classes=attrs.class||'';
  if(tag==='script')return <></>;
  const custom=context.custom(node);if(custom!==undefined)return <>{custom}</>;
  if(classes.split(' ').includes('modal')){return <Dialog open={context.modal===id} onOpenChange={v=>{if(!v)context.close();}} title={id}>{domToReact(node.children as DOMNode[],options)}</Dialog>;}
  if(!context.admin&&!context.auth&&(attrs.onclick?.startsWith('abrirModalCrear')||(tag==='th'&&node.children.some(n=>n.type==='text'&&n.data.trim()==='Acciones'))))return <></>;
  const safeAttrs={...attrs};for(const k of Object.keys(safeAttrs))if(k.startsWith('on')||k==='selected')delete safeAttrs[k];
  const props:any=attributesToProps(safeAttrs);const cell=context.cells[id];
  if(context.auth&&context.busy&&classes.includes('spinner-border'))props.className=classes.replace('d-none','');
  const reactStyle=(style:Record<string,any>={})=>Object.fromEntries(Object.entries(style).map(([key,value])=>[key.replace(/-([a-z])/g,(_match,letter)=>letter.toUpperCase()),value]));
  const containsId=(element:Element,target:string):boolean=>element.attribs.id===target||element.children.some(child=>child instanceof Element&&containsId(child,target));
  if(classes.split(' ').includes('dashboard-card')&&containsId(node,'aptitud-icono'))props.style={...props.style,...reactStyle(context.cells['aptitud-icono::closest']?.style)};
  let children:ReactNode=domToReact(node.children as DOMNode[],options);
  if(cell){if(cell.innerText!==undefined)children=cell.innerText;else if(cell.innerHTML!==undefined&&cell.innerHTML!=='')children=parse(cell.innerHTML,options);props.style={...props.style,...reactStyle(cell.style)};let cl=String(props.className||'').split(' ').filter(x=>!String(cell.removeClass||'').split(' ').includes(x));cl.push(...String(cell.addClass||'').split(' '));props.className=cl.join(' ');}
  if(tag==='canvas'&&context.charts[id])return <Chart id={id} config={context.charts[id]} details={context.chartDetails}/>;
  if(['input','select','textarea'].includes(tag)){
    if(id==='buscar_ciudad')props.onFocus=context.focusCity;
    if(context.values[id]!==undefined){props.value=context.values[id];delete props.defaultValue;}
    if(tag==='select'&&props.value===undefined){const selected=node.children.find(n=>n instanceof Element&&n.attribs.selected!==undefined) as Element|undefined;props.value=selected?.attribs.value;}
    if(tag==='select'&&props.value!==undefined&&props.value!==''){const optVals=node.children.filter((n):n is Element=>n instanceof Element&&n.name==='option').map(n=>n.attribs.value??'');if(!optVals.includes(String(props.value)))children=<><option value={props.value}>{props.value}</option>{children}</>;}
    if(!props.readOnly)props.onChange=(e:React.ChangeEvent<HTMLInputElement>)=>context.setValue(id,e.target.value);
    if(tag==='input')return React.createElement(tag,props);
  }
  if(tag==='form')props.onSubmit=(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();context.submit(id,e.currentTarget);};
  const click=attrs.onclick||id;if(attrs.onclick||tag==='button'||attrs['data-mes']||attrs['data-slot']||classes.includes('btn-simulate')||classes.includes('profile-weather-card'))props.onClick=()=>context.action(click,attrs);
  if(attrs['data-bs-dismiss'])props.onClick=context.close;
  if(attrs.onmouseover?.includes('scale(1.05)')){props.onMouseEnter=(e:React.MouseEvent<HTMLElement>)=>e.currentTarget.style.transform='scale(1.05)';props.onMouseLeave=(e:React.MouseEvent<HTMLElement>)=>e.currentTarget.style.transform='scale(1)';}
  if(classes.includes('tab-pane')){const active=context.tabs.has(id);props.className=classes.replace(/\b(show|active)\b/g,'')+(active?' show active':'');}
  if(attrs['data-bs-toggle']==='pill'){const active=context.tabs.has((attrs['data-bs-target']||'').slice(1));props.className=classes.replace(/\bactive\b/g,'')+(active?' active':'');props['aria-selected']=active;}
  if(attrs['data-mes']){const active=context.months.includes(Number(attrs['data-mes']));props.className='month-chip'+(active?' active':'');children=<><i className={'fas '+(active?'fa-check-circle':'fa-circle')}/>{node.children.filter(n=>n.type==='text').map((n:any)=>n.data).join('')}</>;}
  if(attrs['data-slot'])props.className='time-slot-pill'+(context.slot===attrs['data-slot']?' active':'');
  if(id==='contenedor-vista-pestanas')props.style={...props.style,display:context.grid?'none':'block'};
  if(id==='contenedor-vista-cuadricula')props.style={...props.style,display:context.grid?'block':'none'};
  if(tag==='a'&&attrs.href?.includes('controller=')){props.href=attrs.href.replace('index.php','/');props.onClick=(e:React.MouseEvent)=>{e.preventDefault();context.action('navigate',attrs);};}
  const importantStyles=Object.entries(props.style||{}).filter(([,value])=>typeof value==='string'&&value.includes('!important'));
  if(importantStyles.length){props.style={...props.style};for(const[key,value]of importantStyles)props.style[key]=String(value).replace(/\s*!important\s*$/,'');props.ref=(element:HTMLElement|null)=>{if(element)for(const[key,value]of importantStyles)element.style.setProperty(key.replace(/[A-Z]/g,letter=>'-'+letter.toLowerCase()),String(value).replace(/\s*!important\s*$/,''),'important');};}
  if(tag==='button'){if(context.busy&&props.type==='submit'){props.disabled=true;children=id.startsWith('btn-guardar')?'Guardando...':children;}return <Button {...props} variant={null} size={null}>{children}</Button>;}
  return ['area','base','br','col','embed','hr','img','link','meta','param','source','track','wbr'].includes(tag)?React.createElement(tag,props):React.createElement(tag,props,children);
 }};
 return <>{parse(html,options)}</>;
}

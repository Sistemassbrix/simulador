/** Formatting boundary for the faithfully translated calculator. No DOM or database. */
export type OutputCell={value?:string;innerText?:string;innerHTML?:string;style?:Record<string,string>;className?:string};
export type CalculationView={cells:Record<string,OutputCell>;charts:Record<string,unknown>;details?:unknown};
export class OutputBuffer {
 readonly cells:Record<string,any>={};
 readonly charts:Record<string,any>={};
 constructor(input:Record<string,unknown>){for(const[k,v]of Object.entries(input))this.cells[k]={value:String(v??'')};}
 cell(id:string):any {if(!this.cells[id])this.cells[id]={value:'',innerHTML:'',style:{}};const c=this.cells[id];c.style??={};Object.defineProperty(c,'id',{value:id,enumerable:false,configurable:true});c.getContext=()=>({id});return c;}
 select=(selector:string):any=>{
   const id=selector.startsWith('#')?selector.slice(1):selector;
   const c=this.cell(id);
   const chain:any={length:1,text:(v?:unknown)=>{if(v===undefined)return c.innerText; c.innerText=String(v);return chain;},html:(v?:unknown)=>{if(v===undefined)return c.innerHTML;c.innerHTML=String(v);return chain;},empty:()=>{c.innerHTML='';return chain;},val:()=>c.value,css:(key:any,value?:any)=>{if(typeof key==='string')c.style[key]=value;else Object.assign(c.style,key);return chain;},removeClass:(s:string)=>{c.removeClass=(c.removeClass||'')+' '+s;return chain;},addClass:(s:string)=>{c.addClass=(c.addClass||'')+' '+s;return chain;},closest:()=>this.select(id+'::closest')};
   return chain;
 };
 plotClass(){const charts=this.charts;return class Plot{constructor(target:any,config:any){charts[target.id]=config;}destroy(){}static getChart(_canvas?:any){return null;}};}
 result(details?:unknown):CalculationView{return{cells:this.cells,charts:this.charts,details};}
}

import {useEffect,useRef,useState} from 'react';
import {drawFlow} from '../flow-drawing';
export function Flow({running,reset,batches,initial,final,onProgress,onFinish}:{running:boolean;reset:number;batches:number;initial:number;final:number;onProgress:(v:any)=>void;onFinish:()=>void}){
 const [resizeTick,setResizeTick]=useState(0);
 const canvas=useRef<HTMLCanvasElement>(null);const dimensions=useRef({viewport:0});const particles=useRef(Array.from({length:35},()=>({progress:Math.random(),speed:.003+Math.random()*.002})));const state=useRef({batch:1,stage:0,progress:0,phase:0});
 useEffect(()=>{state.current={batch:1,stage:0,progress:0,phase:0};},[reset]);
 // Measure the source view's canvas container on entry and viewport resize.
 useEffect(()=>{let frame=0;let stopped=false;const render=()=>{if(stopped||!canvas.current)return;const c=canvas.current,s=state.current,total=Math.max(1,Math.ceil(batches));if(dimensions.current.viewport!==window.innerWidth||c.width!==c.parentElement?.clientWidth){const changedViewport=dimensions.current.viewport!==window.innerWidth;c.width=c.parentElement?.clientWidth||600;if(changedViewport)c.height=c.parentElement?.clientHeight||398;dimensions.current.viewport=window.innerWidth;}
  if(running){for(const p of particles.current){p.progress+=p.speed;if(p.progress>1)p.progress=0;}s.progress+=.15;s.phase=(s.phase+.004)%1;if(s.progress>=100){s.progress=0;s.stage++;if(s.stage>=6){s.stage=0;s.batch++;}if(s.batch>total){s.batch=total;s.stage=5;s.progress=100;onFinish();}}}
  const routes=s.batch===1?['SC_TS,TS_DB','TS_DB,DB_TS','TS_DB,DB_TS','TS_DB,DB_TS','TS_DB,DB_TS','DB_TS,TS_SA']:['SC_TS,TS_DB','TS_DB,DB_TS','TS_DB,DB_TS','TS_DB,DB_TS','TS_DB,DB_TS','DB_TS,TS_SA'];
  const p=s.progress/100;let fills={SC:.9,TS:0,DB:0,SA:(s.batch-1)/total};if(s.stage===0)fills={SC:Math.max(0,.9-p*.9),TS:s.batch===1?p:1,DB:p,SA:fills.SA};else if(s.stage===5)fills={SC:0,TS:s.batch===total?1-p:1,DB:1-p,SA:Math.min(1,(s.batch-1+p)/total)};else fills={SC:0,TS:1,DB:1,SA:fills.SA};
  drawFlow(c,fills,{route:routes[s.stage],color:(s.batch===1?['#eab308','#10b981','#3b82f6','#10b981','#3b82f6','#a855f7']:['#eab308','#3b82f6','#10b981','#3b82f6','#3b82f6','#a855f7'])[s.stage]},particles.current);
  onProgress({batch:s.batch,stage:s.stage,total,initial,final});if(running)frame=requestAnimationFrame(render);};render();return()=>{stopped=true;cancelAnimationFrame(frame);};},[running,reset,batches,initial,final,onProgress,onFinish,resizeTick]);
 useEffect(()=>{const resize=()=>{dimensions.current.viewport=0;setResizeTick(t=>t+1);};window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
 return <canvas id="simCanvas" ref={canvas}/>;
}

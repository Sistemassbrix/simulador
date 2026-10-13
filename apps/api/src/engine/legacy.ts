/** The independent legacy PHP endpoint uses tonnes/hour, unlike the visible engine. */
export function calculateLegacy(d:Record<string,any>){
 const norm=String(d.tipo_grano??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const num=(k:string,def:number)=>{const v=parseFloat(d[k]??String(def));return Number.isNaN(v)?0:v;};
 const fmt=(v:number,n:number,comma=false)=>{const factor=10**n;const abs=Math.round((Math.abs(v)+Number.EPSILON)*factor)/factor;const s=(v<0?-abs:abs).toFixed(n);return comma?s.replace('.',','):s;};
 const limit=num('limite_temp',60),M0=num('humedad_inicial',24),Mf=num('humedad_objetivo',14),meta=num('meta_procesamiento',5),temp=num('temp_ambiente',28.5),hr=num('hr_ambiente',65),alt=num('altitud',500),operation=num('factor_operatividad',.85);
 let efficiency=parseFloat(String(d.eficiencia??'85').replace(',','.'))||0;if(efficiency<=0)efficiency=1;efficiency=efficiency<=1?efficiency:efficiency/100;
 let cp=1.8,hfg=2450,eff=.5,a=172.12,b=-269.73,c=71.55,max=43;
 if(norm.includes('maiz')){cp=2;hfg=2500;eff=.6;a=200;b=-300;c=70;max=norm.includes('blanco')?60:85;}
 else if(norm.includes('soja')||norm.includes('soya')){cp=1.9;hfg=2300;eff=.4;a=150;b=-250;c=60;max=45;}
 max=Math.min(limit,max);
 const mass=meta*1000,water=mass*(M0-Mf)/(100-Mf),final=(mass-water)/1000,kw=(water*hfg/3600)/efficiency,wet=meta*24*operation,dry=wet-(water/1000)*24*operation;
 const pressure=(101325/1000)*Math.pow(1-(225577/10000000000)*alt,52559/10000),rho=pressure*1000/(287.05*(temp+273.15));
 const diff=M0-Mf,cool=Math.min(1,diff*.1),heat=diff-cool;let current=M0;
 const strategy=[.27,.26,.25,.22].map((ratio,i)=>{const start=current;current-=heat*ratio;return{etapa:`Paso ${i+1} (Calor)`,hum_inicio:fmt(start,1,true)+'%',hum_fin:fmt(current,1,true)+'%',temp_sugerida:fmt(Math.min(max+[17,12,7,2][i],[61.5,57.1,53.3,50][i]),1,true),temp_manual:['80,0','75,0','70,0','65,0'][i]};});
 strategy.push({etapa:'Enfriamiento (Vent. Inferior)',hum_inicio:fmt(current,1,true)+'%',hum_fin:fmt(Mf,1,true)+'%',temp_sugerida:'17,8',temp_manual:'17,8'});
 return{agua_evaporar:fmt(water,2),produccion_final:fmt(final,2),consumo_kw:fmt(kw*24*operation,1),grano_humedo_dia:fmt(wet,0),grano_seco_dia:fmt(dry,0),psicrometria:{presion:fmt(pressure,2),densidad_aire:fmt(rho,3),punto_rocio:fmt(temp-(100-hr)/5,1),cp:fmt(cp,2),h_fg:fmt(hfg,1),efic:fmt(eff,2),tg_a:fmt(a,2),tg_b:fmt(b,2),tg_c:fmt(c,2),t_max_g:fmt(max,1),densidad_grano:fmt(num('densidad',720)/1000,2)},estrategia:strategy};
}

export let csrf='';
export function setCsrf(value:string){csrf=value;}
export async function api(path:string,body?:unknown){const response=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:body===undefined?undefined:JSON.stringify(body)});const data=await response.json();if(!response.ok||data.status==='error')throw new Error(data.message||'Problema de conexión con el servidor');if(data.csrf)csrf=data.csrf;return data;}

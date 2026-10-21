const initial={recipient:'Para ti, mi amor',subtitle:'Hay cosas que merecen escribirse a mano.',message:'Hay muchas historias bonitas, pero mi favorita es la nuestra.\n\nQué suerte la mía, coincidir contigo.',signature:'Con todo mi amor',sender:'Siempre tuyo ♡',font:'serif',color:'#803641',paper:'#f3e9d2',size:22};
const keys=Object.keys(initial);
const json=(status,data,extra={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...extra}});
export const valid=d=>d && ['recipient','subtitle','message','signature','sender'].every(k=>typeof d[k]==='string'&&d[k].length<=(k==='message'?8000:180))&&['serif','script','classic'].includes(d.font)&&/^#[0-9a-f]{6}$/i.test(d.color)&&/^#[0-9a-f]{6}$/i.test(d.paper)&&Number.isInteger(d.size)&&d.size>=16&&d.size<=30;
const hex=b=>Array.from(new Uint8Array(b),n=>n.toString(16).padStart(2,'0')).join('');
const digest=async s=>hex(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
async function equal(a,b){const x=await digest(a),y=await digest(b);let diff=0;for(let i=0;i<x.length;i++)diff|=x.charCodeAt(i)^y.charCodeAt(i);return diff===0;}
async function body(request){const reader=request.body?.getReader();if(!reader)throw new Error();const chunks=[];let length=0;try{while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>65536){await reader.cancel();throw new Error();}chunks.push(value);}}finally{reader.releaseLock();}const bytes=new Uint8Array(length);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}return JSON.parse(new TextDecoder().decode(bytes));}
export async function handle(request,env){
 const url=new URL(request.url),route=url.pathname,method=request.method,now=Date.now();
 if(!env.DB||!env.ADMIN_USER||!env.ADMIN_PASSWORD)return json(503,{error:'Falta configurar la base de datos o los secretos del administrador.'});
 if(!['GET','HEAD'].includes(method)&&request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return json(403,{error:'Origen no permitido.'});
 const token=/(?:^|;\s*)amor_session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('Cookie')||'')?.[1];
 const session=async()=>token && await env.DB.prepare('SELECT token FROM sessions WHERE token = ? AND expires > ?').bind(await digest(token),now).first();
 try{
  if(route==='/api/letter'&&method==='GET'){
   const row=await env.DB.prepare('SELECT content FROM letter WHERE id = 1').first();
   // Defaults are only displayed, never written over an existing saved letter.
   return json(200,row?JSON.parse(row.content):initial);
  }
  if(route==='/api/session'&&method==='GET')return json(200,{authenticated:!!await session()});
  if(route==='/api/login'&&method==='POST'){
   const d=await body(request),ip=await digest(request.headers.get('CF-Connecting-IP')||'local');
   const result=await env.DB.prepare('INSERT INTO attempts (ip,count,expires) VALUES (?,1,?) ON CONFLICT(ip) DO UPDATE SET count = CASE WHEN expires <= ? THEN 1 ELSE count + 1 END, expires = CASE WHEN expires <= ? THEN excluded.expires ELSE expires END RETURNING count').bind(ip,now+900000,now,now).first();
   const correct=await equal(String(d.password||''),env.ADMIN_PASSWORD);
   // Network addresses can be shared or change on mobile networks. A valid
   // credential must not be rejected because another attempt used that IP.
   if(d.username!==env.ADMIN_USER||!correct){
    if(result.count>8)return json(429,{error:'Demasiados intentos incorrectos. Comprueba tus datos; con la contraseña correcta puedes entrar.'});
    return json(401,{error:'Usuario o contraseña incorrectos.'});
   }
   const raw=hex(crypto.getRandomValues(new Uint8Array(32)));
   await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires <= ?').bind(now),
    env.DB.prepare('DELETE FROM attempts WHERE expires <= ? OR ip = ?').bind(now,ip),
    env.DB.prepare('INSERT INTO sessions (token,expires) VALUES (?,?)').bind(await digest(raw),now+3600000)
   ]);
   return json(200,{ok:true},{'Set-Cookie':`amor_session=${raw}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600`});
  }
  if(route==='/api/logout'&&method==='POST'){
   if(token)await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(await digest(token)).run();
   return json(200,{ok:true},{'Set-Cookie':'amor_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});
  }
  if(route==='/api/letter'&&method==='PUT'){
   if(!await session())return json(401,{error:'Inicia sesión para guardar.'});
   const d=await body(request);if(!valid(d))return json(400,{error:'Revisa los campos de la carta.'});
   const clean=Object.fromEntries(keys.map(k=>[k,d[k]]));
   await env.DB.prepare('INSERT INTO letter (id,content,previous,updated_at) VALUES (1,?,NULL,?) ON CONFLICT(id) DO UPDATE SET previous = content, content = excluded.content, updated_at = excluded.updated_at').bind(JSON.stringify(clean),now).run();
   return json(200,{ok:true});
  }
  return json(404,{error:'Ruta no encontrada.'});
 }catch(error){if(error instanceof SyntaxError)return json(400,{error:'Solicitud inválida.'});return json(503,{error:'No se pudo completar la operación. Tus datos guardados no se han reemplazado. Intenta de nuevo.'});}
}

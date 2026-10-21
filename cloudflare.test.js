const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {DatabaseSync}=require('node:sqlite');
test('Cloudflare: autenticación, guardado persistente, copia anterior y cierre de sesión',async()=>{
 const {handle}=await import('./cloudflare/api.mjs');
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec(fs.readFileSync('cloudflare/schema.sql','utf8'));
 const DB={prepare(sql){let params=[];return {bind(...values){params=values;return this;},async first(){return sqlite.prepare(sql).get(...params)||null;},async run(){return sqlite.prepare(sql).run(...params);}};},async batch(statements){sqlite.exec('BEGIN');try{for(const s of statements)await s.run();sqlite.exec('COMMIT');}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
 const env={DB,ADMIN_USER:'autor',ADMIN_PASSWORD:'una-contraseña-privada-larga'};
 const req=(route,method='GET',data,cookie)=>new Request('https://carta.pages.dev/api/'+route,{method,headers:{...(cookie?{Cookie:cookie}:{}),'Content-Type':'application/json'},...(data!==undefined?{body:JSON.stringify(data)}:{})});
 try{
  let r=await handle(req('letter'),env);const initial=await r.json();assert.equal(r.status,200);
  r=await handle(req('letter','PUT',initial),env);assert.equal(r.status,401);
  r=await handle(req('login','POST',{username:'autor',password:'mal'}),env);assert.equal(r.status,401);
  r=await handle(req('login','POST',{username:'autor',password:env.ADMIN_PASSWORD}),env);assert.equal(r.status,200);
  const cookie=r.headers.get('set-cookie').split(';')[0];assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  r=await handle(req('session','GET',undefined,cookie),env);assert.equal((await r.json()).authenticated,true);
  const changed={...initial,message:'Carta guardada con acentos y corazones ♡',sender:'Mi firma'};
  r=await handle(req('letter','PUT',changed,cookie),env);assert.equal(r.status,200);
  // A new environment/request has no process memory and reads the same D1 record.
  r=await handle(req('letter'),{...env});assert.deepEqual(await r.json(),changed);
  r=await handle(req('letter','PUT',{...changed,sender:'Otra firma'},cookie),env);assert.equal(r.status,200);
  assert.deepEqual(JSON.parse(sqlite.prepare('SELECT previous FROM letter WHERE id=1').get().previous),changed);
  r=await handle(req('letter','PUT',{...changed,size:99},cookie),env);assert.equal(r.status,400);
  const foreign=req('letter','PUT',changed,cookie);foreign.headers.set('Origin','https://otro.example');r=await handle(foreign,env);assert.equal(r.status,403);
  r=await handle(req('logout','POST',undefined,cookie),env);assert.equal(r.status,200);
  r=await handle(req('letter','PUT',initial,cookie),env);assert.equal(r.status,401);
  for(let i=0;i<8;i++){r=await handle(req('login','POST',{username:'autor',password:'mal'}),env);assert.equal(r.status,401);}
  r=await handle(req('login','POST',{username:'autor',password:'mal'}),env);assert.equal(r.status,429);
  r=await handle(req('letter'),{});assert.equal(r.status,503);
 }finally{sqlite.close();}
});

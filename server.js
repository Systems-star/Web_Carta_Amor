const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.join(__dirname, 'public');
const {createStorage}=require('./storage');
const production=process.env.NODE_ENV==='production';
if(production && (!process.env.ADMIN_USER || !process.env.ADMIN_PASSWORD || !process.env.DATA_DIR)) throw new Error('Configura ADMIN_USER, ADMIN_PASSWORD y DATA_DIR en un disco persistente antes de publicar.');
const defaults = { recipient: 'Para ti, mi amor', subtitle: 'Hay cosas que merecen escribirse a mano.', message: 'Si pudiera guardar un instante para siempre, elegiría cualquiera en el que estés tú.\n\nDesde que llegaste, los días tienen un poco más de luz y las pequeñas cosas se han convertido en mis favoritas: tu risa, nuestras conversaciones y esa manera tan tuya de hacerme sentir en casa.\n\nEsta carta es una pequeña promesa: seguir eligiéndote, en los días bonitos y en los que necesitemos abrazarnos un poquito más.\n\nQué suerte la mía, coincidir contigo.', signature: 'Con todo mi amor', sender: 'Siempre tuyo ♡', font: 'serif', color: '#803641', paper: '#f3e9d2', size: 22 };
const username = process.env.ADMIN_USER || 'adminamor';
const salt = crypto.randomBytes(32);
const passwordHash = crypto.scryptSync(process.env.ADMIN_PASSWORD || 'Rosa!Luna2026#Carta', salt, 64);
const sessions = new Map(), attempts = new Map();
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const storage=createStorage(path.resolve(process.env.DATA_DIR || path.join(__dirname,'data')),defaults,valid);
const read = () => storage.read();
function authorized(req) { const id = /(?:^|;\s*)amor_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]; return sessions.get(id) > Date.now(); }
async function body(req) { const chunks=[];let length=0;for await (const chunk of req) {length+=chunk.length;if(length>65536)throw new Error('Petición demasiado grande');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
function valid(d) { return d && ['recipient','subtitle','message','signature','sender'].every(k => typeof d[k] === 'string' && d[k].length <= (k === 'message' ? 8000 : 180)) && ['serif','script','classic'].includes(d.font) && /^#[0-9a-f]{6}$/i.test(d.color) && /^#[0-9a-f]{6}$/i.test(d.paper) && Number.isInteger(d.size) && d.size >= 16 && d.size <= 30; }
const server = http.createServer(async (req, res) => {
 res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy','same-origin');
 const url = new URL(req.url, 'http://localhost');
 try {
  if (['POST','PUT','DELETE'].includes(req.method) && req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(res,403,{error:'Origen no permitido'});
  if (url.pathname === '/api/letter' && req.method === 'GET') return json(res,200,read());
  if (url.pathname === '/api/session' && req.method === 'GET') return json(res,200,{ authenticated: authorized(req) });
  if (url.pathname === '/api/login' && req.method === 'POST') {
   const ip = req.socket.remoteAddress, now = Date.now(); let a = attempts.get(ip);
   if (!a || now > a.until) { a = { count:0, until:now + 15*60*1000 }; attempts.set(ip,a); }
   if (a.count >= 8) return json(res,429,{error:'Demasiados intentos. Espera 15 minutos.'});
   const d = await body(req); a.count++;
   const hash = crypto.scryptSync(String(d.password || ''),salt,64);
   if (d.username !== username || !crypto.timingSafeEqual(hash,passwordHash)) return json(res,401,{error:'Usuario o contraseña incorrectos.'});
   attempts.delete(ip); const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,now+3600000);
   res.setHeader('Set-Cookie',`amor_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${production || process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''}`); return json(res,200,{ok:true});
  }
  if (url.pathname === '/api/logout' && req.method === 'POST') { const token=/(?:^|;\s*)amor_session=([a-f0-9]+)/.exec(req.headers.cookie || '')?.[1]; sessions.delete(token); res.setHeader('Set-Cookie','amor_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'); return json(res,200,{ok:true}); }
  if (url.pathname === '/api/letter' && req.method === 'PUT') {
   if (!authorized(req)) return json(res,401,{error:'Inicia sesión para guardar.'});
   const d=await body(req); if (!valid(d)) return json(res,400,{error:'Revisa los campos y los colores.'});
   const clean=Object.fromEntries(Object.keys(defaults).map(k=>[k,d[k]])); storage.write(clean); return json(res,200,{ok:true});
  }
  if (url.pathname.startsWith('/api/')) return json(res,404,{error:'Ruta no encontrada'});
  const allowed = { '/':'index.html', '/style.css':'style.css', '/app.js':'app.js', '/rose.svg':'rose.svg' };
  const name=allowed[url.pathname]; if (!name || req.method !== 'GET') { res.writeHead(404); return res.end('No encontrado'); }
  res.setHeader('Content-Type', {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml'}[path.extname(name)]);
  res.setHeader('Cache-Control','no-cache');
  res.end(fs.readFileSync(path.join(root,name)));
 } catch { json(res,400,{error:'No se pudo procesar la solicitud.'}); }
});
if(require.main===module) {
 const port=Number(process.env.PORT)||3000;
 server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`El puerto ${port} está ocupado. Cierra la otra vista previa o cambia PORT.`:error.message);process.exitCode=1;});
 server.listen(port,process.env.HOST || (production?'0.0.0.0':'127.0.0.1'),()=>console.log(`Tu carta está en http://localhost:${port}`));
}
module.exports={server,valid};

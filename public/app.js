const $ = s => document.querySelector(s);
let saved, opened = false;
const fonts = {serif:'Georgia, serif',script:'"Segoe Print", "Bradley Hand", cursive',classic:'"Palatino Linotype", Palatino, serif'};
function render(d) { for (const k of ['recipient','message','signature','sender','subtitle']) $('#'+k).textContent = d[k]; $('#paper').style.setProperty('--ink',d.color); $('#paper').style.setProperty('--paper',d.paper); $('#paper').style.fontFamily=fonts[d.font]; $('#message').style.setProperty('--message-size',d.size+'px'); if(opened) requestAnimationFrame(measureLetter); }
let moving = false;
function measureLetter() {
 const paper = $('#paper');
 // Measure an independent copy so neither height:auto nor measurement changes
 // interrupt the visible sheet's animation.
 const copy = paper.cloneNode(true);
 copy.removeAttribute('id');
 copy.querySelectorAll('[id]').forEach(el => {
  const original = document.getElementById(el.id);
  const style = getComputedStyle(original);
  for(const key of ['fontSize','lineHeight','whiteSpace','overflowWrap','textAlign','marginTop','marginBottom','paddingTop']) el.style[key]=style[key];
  el.removeAttribute('id');
 });
 Object.assign(copy.style, {position:'fixed',width:paper.getBoundingClientRect().width+'px',height:'auto',minHeight:'0',maxHeight:'none',visibility:'hidden',transition:'none',transform:'none',padding:getComputedStyle(paper).padding});
 document.body.append(copy);
 $('#envelope').style.setProperty('--sheet-height', Math.ceil(copy.getBoundingClientRect().height)+'px');
 copy.remove();
}
function toggle() {
 if (moving) return;
 measureLetter();
 opened=!opened;
 moving=true;
 $('#envelope').classList.toggle('opened',opened);
 $('#paper').setAttribute('aria-hidden',String(!opened));
 $('#toggle-letter').setAttribute('aria-expanded',String(opened));
 $('#toggle-letter').innerHTML=opened?'Doblar esta historia <span>↙</span>':'Rompe el sello, abre mi corazón <span>↗</span>';
 $('#seal').setAttribute('aria-label',opened?'Cerrar mi carta':'Abrir mi carta');
 setTimeout(()=>{moving=false;if(opened) $('#paper').focus({preventScroll:true});},matchMedia('(prefers-reduced-motion: reduce)').matches?0:1700);
}
$('#paper').setAttribute('aria-hidden','true');
$('#toggle-letter').setAttribute('aria-expanded','false');
$('#toggle-letter').setAttribute('aria-controls','paper');
let lastWidth = 0;
new ResizeObserver(entries => {
 const width=entries[0].contentRect.width;
 if(width !== lastWidth) {lastWidth=width;measureLetter();}
}).observe($('#paper'));
$('#seal').onclick=toggle; $('#toggle-letter').onclick=toggle;
async function api(url,options) { const r=await fetch(url,options); const d=await r.json(); if(!r.ok) throw new Error(d.error||'No se pudo completar la solicitud'); return d; }
function fillEditor(data) { for(const [k,v] of Object.entries(data)) if($('#editor-form').elements[k]) $('#editor-form').elements[k].value=v; $('#size-value').value=data.size+' px'; }
function edit() { if(!saved){toast('Espera a que termine de cargar la carta.');return;} fillEditor(saved); $('#save-status').textContent=''; $('#editor-dialog').showModal(); }
const backupActions=document.createElement('div');
backupActions.className='actions backup-actions';
backupActions.innerHTML='<button type="button" class="secondary" id="download-backup">Descargar respaldo</button><label class="secondary restore-label">Restaurar respaldo<input id="restore-backup" type="file" accept="application/json,.json"></label>';
$('#editor-form').append(backupActions);
$('#download-backup').onclick=()=>{
 const url=URL.createObjectURL(new Blob([JSON.stringify(saved,null,2)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='mi-carta-respaldo.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('#restore-backup').onchange=async e=>{
 try {
  const file=e.target.files[0];if(!file)return;
  if(file.size>65536)throw new Error('El respaldo es demasiado grande.');
  const d=JSON.parse(await file.text());
  if(!['recipient','subtitle','message','signature','sender'].every(k=>typeof d[k]==='string'&&d[k].length<=(k==='message'?8000:180)) || !['serif','classic','script'].includes(d.font) || !/^#[a-f0-9]{6}$/i.test(d.color) || !/^#[a-f0-9]{6}$/i.test(d.paper) || !Number.isInteger(d.size) || d.size<16 || d.size>30)throw new Error('El archivo no es un respaldo válido de la carta.');
  fillEditor(d);render(d);$('#save-status').textContent='Respaldo cargado en la vista previa. Pulsa Guardar carta para confirmarlo.';
 }catch(err){$('#save-status').textContent=err.message;}finally{e.target.value='';}
};
$('#admin-entry').onclick=async()=>{ try { const s=await api('/api/session'); if(s.authenticated) edit(); else $('#login-dialog').showModal(); } catch(e){toast(e.message);} };
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{b.closest('dialog').close();if(saved)render(saved);});
$('#editor-dialog').addEventListener('cancel',()=>render(saved));
$('#login-form').onsubmit=async e=>{e.preventDefault(); const b=e.submitter;b.disabled=true;try {await api('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});$('#login-dialog').close();e.target.reset();$('#login-error').textContent='';edit();}catch(err){$('#login-error').textContent=err.message;}finally{b.disabled=false;}};
function formData(){const d=Object.fromEntries(new FormData($('#editor-form')));d.size=Number(d.size);return d;}
$('#editor-form').oninput=()=>{const d=formData();render(d);$('#size-value').value=d.size+' px';};
$('#editor-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;try{const d=formData();await api('/api/letter',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)});saved=d;render(saved);$('#editor-dialog').close();toast('Tu carta se ha guardado con amor.');}catch(err){$('#save-status').textContent=err.message;}finally{e.submitter.disabled=false;}};
$('#logout').onclick=async()=>{try{await api('/api/logout',{method:'POST'});$('#editor-dialog').close();render(saved);toast('Sesión cerrada.');}catch(e){$('#save-status').textContent=e.message;}};
let timer;function toast(t){$('#toast').textContent=t;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),5000);}
api('/api/letter').then(d=>{saved=d;render(d);}).catch(()=>toast('No se pudo cargar la carta. Revisa que el servidor esté iniciado.'));


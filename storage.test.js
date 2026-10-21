const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {createStorage}=require('./storage');
test('el guardado sobrevive a una nueva instancia y recupera la copia anterior',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amor-storage-'));
 try {
  const defaults={message:'Original ♡'}, valid=d=>typeof d?.message==='string';
  const first=createStorage(dir,defaults,valid);
  assert.deepEqual(first.read(),defaults);
  first.write({message:'Primer cambio con tildes: corazón'});
  const restart=createStorage(dir,defaults,valid);
  assert.equal(restart.read().message,'Primer cambio con tildes: corazón');
  restart.write({message:'Segundo cambio'});
  fs.writeFileSync(path.join(dir,'letter.json'),'{archivo dañado');
  assert.equal(restart.read().message,'Primer cambio con tildes: corazón');
  assert.ok(fs.readdirSync(dir).some(f=>f.includes('.damaged-')));
  assert.throws(()=>restart.write({message:null}));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('un archivo dañado sin respaldo no se reemplaza por datos predeterminados',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'amor-storage-'));
 try {
  fs.writeFileSync(path.join(dir,'letter.json'),'dato dañado');
  const store=createStorage(dir,{message:'Original'},d=>typeof d?.message==='string');
  assert.throws(()=>store.read());
  assert.equal(fs.readFileSync(path.join(dir,'letter.json'),'utf8'),'dato dañado');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});

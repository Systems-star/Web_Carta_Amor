const fs = require('node:fs');
const path = require('node:path');
function createStorage(directory, defaults, valid) {
 fs.mkdirSync(directory,{recursive:true});
 const file=path.join(directory,'letter.json'), backup=file+'.bak';
 function load(target) { const d=JSON.parse(fs.readFileSync(target,'utf8')); if(!valid(d)) throw new Error('Carta inválida'); return d; }
 function atomic(target, data) {
  const temp=target+'.'+process.pid+'.tmp';
  let fd;
  try { fd=fs.openSync(temp,'w',0o600); fs.writeFileSync(fd,JSON.stringify(data,null,2),'utf8'); fs.fsyncSync(fd); fs.closeSync(fd); fd=undefined; fs.renameSync(temp,target); }
  finally { if(fd!==undefined)fs.closeSync(fd); if(fs.existsSync(temp))fs.unlinkSync(temp); }
 }
 function read() {
  try { return load(file); }
  catch(error) {
   if(fs.existsSync(backup)) {
    const recovered=load(backup);
    // Preserve the damaged file before recovering the last valid copy.
    if(fs.existsSync(file))fs.copyFileSync(file,file+'.damaged-'+Date.now());
    atomic(file,recovered);
    return recovered;
   }
   if(fs.existsSync(file)) throw error;
   atomic(file,defaults); atomic(backup,defaults); return {...defaults};
  }
 }
 function write(data) {
  if(!valid(data))throw new Error('Carta inválida');
  const previous=read();
  atomic(backup,previous);
  atomic(file,data);
 }
 return {read,write};
}
module.exports={createStorage};

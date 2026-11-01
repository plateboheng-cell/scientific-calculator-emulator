const fs=require('node:fs'),path=require('node:path');
const MAX_BYTES=16*1024*1024;
function valid(text){if(typeof text!=='string'||Buffer.byteLength(text)>MAX_BYTES)throw Error('Saved state exceeds 16 MB');const data=JSON.parse(text);if(data?.version!==2||!data.profiles||typeof data.profiles!=='object'||Array.isArray(data.profiles))throw Error('Invalid saved-state format');return text;}
function createStateFile(directory){
  const file=path.join(directory,'scientific-calculator-state.json'),backup=file+'.bak',temporary=file+'.tmp';
  return {load(){
    if(!fs.existsSync(file))return {ok:true,value:null};
    try{return {ok:true,value:valid(fs.readFileSync(file,'utf8'))};}
    catch(error){try{return {ok:true,value:valid(fs.readFileSync(backup,'utf8')),recovered:true};}catch{return {ok:false,error:error.message};}}
  },save(text){
    try{valid(text);fs.mkdirSync(directory,{recursive:true});if(fs.existsSync(file)){try{valid(fs.readFileSync(file,'utf8'));fs.copyFileSync(file,backup);}catch{/* Preserve a previously valid backup. */}}
      fs.writeFileSync(temporary,text,'utf8');fs.renameSync(temporary,file);return {ok:true};
    }catch(error){try{if(fs.existsSync(temporary))fs.unlinkSync(temporary);}catch{}return {ok:false,error:error.message};}
  }};
}
module.exports={createStateFile,MAX_BYTES};

import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {pathToFileURL} from 'node:url';
const run=promisify(execFile);
export const isOffice=name=>/\.(docx?|pptx?)$/i.test(name);
export async function officePreview(source,fingerprint){
 const temp=await fs.mkdtemp(path.join(os.tmpdir(),'portfolio-office-'));
 try{await run('soffice',['-env:UserInstallation='+pathToFileURL(path.join(temp,'profile')).href,'--headless','--convert-to','pdf','--outdir',temp,path.resolve(source)],{timeout:120000,maxBuffer:1024*1024});
  const converted=path.join(temp,path.basename(source,path.extname(source))+'.pdf'),target='previews/'+fingerprint+'.pdf';await fs.mkdir('public/previews',{recursive:true});await fs.copyFile(converted,path.join('public',target));return './'+target;
 }catch{throw Error('Office preview conversion failed. Install LibreOffice and retry: '+path.basename(source));}
 finally{await fs.rm(temp,{recursive:true,force:true});}
}

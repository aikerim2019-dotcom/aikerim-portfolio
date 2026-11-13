export const MAX_FILE_BYTES=500*1024*1024;
export const CHUNK_BYTES=16*1024*1024;
export const SITE_BYTES=900000000;
export const MANIFEST_SUFFIX='.portfolio-file.json';
const mime=new Set(['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','image/jpeg','image/png','image/webp','image/gif']);
export function normalizeManifest(value){
 if(!value||value.version!==1||typeof value.name!=='string'||!value.name||/[\\/\x00-\x1f]/.test(value.name)||!mime.has(value.type)||!Number.isSafeInteger(value.size)||value.size<1||value.size>MAX_FILE_BYTES||!Array.isArray(value.parts)||!value.parts.length||value.parts.length>Math.ceil(MAX_FILE_BYTES/CHUNK_BYTES))throw Error('Ірі файлдың сипаттамасы жарамсыз.');
 const seen=new Set();let total=0;
 const parts=value.parts.map(part=>{if(!part||!/^file-parts\/[a-f0-9-]+\/\d{5}\.part$/.test(part.path)||seen.has(part.path)||!Number.isSafeInteger(part.size)||part.size<1||part.size>CHUNK_BYTES||!/^[a-f0-9]{40,64}$/.test(part.sha)||!/^[a-f0-9]{64}$/.test(part.sha256))throw Error('Ірі файлдың бөліктері жарамсыз.');seen.add(part.path);total+=part.size;return {path:part.path,size:part.size,sha:part.sha,sha256:part.sha256,...(part.href?{href:part.href}:{})};});
 if(total!==value.size)throw Error('Ірі файлдың көлемі сәйкес келмейді.');return {version:1,name:value.name,type:value.type,size:value.size,parts};
}
export async function consumeParts(doc,readPart,onProgress,write){
 const data=normalizeManifest({version:1,name:doc.name,type:doc.type,size:doc.size,parts:doc.parts});let complete=0;
 for(const part of data.parts){const raw=await readPart(part),bytes=raw instanceof Uint8Array?raw:new Uint8Array(raw);if(bytes.byteLength!==part.size)throw Error('Файл толық жүктелмеді. Қайта көріңіз.');const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');if(hash!==part.sha256)throw Error('Файл тұтастығын тексеру сәтсіз аяқталды.');await write(bytes);complete+=bytes.byteLength;onProgress?.(Math.round(complete/data.size*100));}
}
export async function assemble(doc,readPart,onProgress){const parts=[];await consumeParts(doc,readPart,onProgress,bytes=>parts.push(bytes));return new Blob(parts,{type:doc.type});}
if(typeof window!=='undefined')window.PortfolioLargeFiles={MAX_FILE_BYTES,CHUNK_BYTES,SITE_BYTES,MANIFEST_SUFFIX,normalizeManifest,consumeParts,assemble};

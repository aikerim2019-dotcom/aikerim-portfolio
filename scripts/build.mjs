import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import os from 'node:os';
import {officePreview,isOffice} from './office-preview.mjs';
import {renderHome} from '../src/home-content.mjs';
import {cardMarkup} from '../src/cards.mjs';
import {normalizeManifest,MANIFEST_SUFFIX,SITE_BYTES} from '../src/large-files.mjs';
const config=JSON.parse(await fs.readFile('site.config.json','utf8'));
const meta=JSON.parse(await fs.readFile('documents.meta.json','utf8'));
const items=JSON.parse(await fs.readFile('items.config.json','utf8'));
const sections={learning:'Студенттің оқу қоржыны',home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',projects:'Менің жобаларым',documents:'Құжаттар қоры',achievements:'Жетістіктер',students:'Студенттер жетістіктері',contact:'Байланыс'};
const cats={certificates:'Сертификаттар',awards:'Марапаттар',materials:'Әдістемелік материалдар',articles:'Ғылыми мақалалар',students:'Студенттер жетістіктері',other:'Басқа құжаттар'};
const legacySections={certificates:'about',awards:'achievements',materials:'materials',articles:'materials',students:'students',other:'documents'};
const types={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'};
await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});
const documents=[];
function describe(rel,name,size,type,extra={}){
 const parts=rel.split('/'),m=meta[rel]||{},item=parts[0]==='items'&&items[parts[1]]?parts[1]:items[m.item]?m.item:null,section=item?items[item].section:parts[0]==='sections'&&sections[parts[1]]?parts[1]:legacySections[parts[0]]||'documents';
 return {id:rel,title:m.title||name.replace(/\.[^.]+$/,'').replaceAll('_',' '),description:m.description||'',year:m.year||name.match(/(?:19|20)\d{2}/)?.[0]||'',item,itemTitle:item?items[item].title:'',section,sectionTitle:sections[section],category:cats[parts[0]]||(type.startsWith('image/')?'Фотосуреттер':'Басқа құжаттар'),name,size,type,...extra};
}
let publishedBytes=0;const copiedParts=new Set();
async function walk(dir){
 for(const e of await fs.readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);if(e.isDirectory()){await walk(p);continue;}
  const rel=path.relative('documents',p).split(path.sep).join('/');
  if(e.name.endsWith(MANIFEST_SUFFIX)){
   const raw=await fs.readFile(p),manifest=normalizeManifest(JSON.parse(raw)),fileVersion=createHash('sha256').update(raw).digest('hex').slice(0,12),parts=[];
   for(const part of manifest.parts){
    if(!copiedParts.has(part.path)){const bytes=await fs.readFile(part.path);if(bytes.length!==part.size||createHash('sha256').update(bytes).digest('hex')!==part.sha256)throw Error('Large file integrity check failed: '+part.path);const target=path.join('public',part.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(part.path,target);publishedBytes+=part.size;copiedParts.add(part.path);}
    parts.push({...part,href:'./'+part.path+'?v='+part.sha256.slice(0,12)});
   }
   let preview;
   if(isOffice(manifest.name)){const temp=await fs.mkdtemp(path.join(os.tmpdir(),'portfolio-parts-')),source=path.join(temp,manifest.name);try{const handle=await fs.open(source,'w');try{for(const part of manifest.parts)await handle.writeFile(await fs.readFile(part.path));}finally{await handle.close();}preview=await officePreview(source,createHash('sha256').update(rel+fileVersion).digest('hex').slice(0,24));}finally{await fs.rm(temp,{recursive:true,force:true});}}
   documents.push(describe(rel,manifest.name,manifest.size,manifest.type,{storage:'chunked',fileVersion,parts,href:'#',...(preview?{preview}:{})}));continue;
  }
  const ext=e.name.split('.').pop().toLowerCase();if(!types[ext])continue;const stat=await fs.stat(p),fileVersion=createHash('sha256').update(await fs.readFile(p)).digest('hex').slice(0,12);
  const preview=isOffice(e.name)?await officePreview(p,createHash('sha256').update(rel+fileVersion).digest('hex').slice(0,24)):null;
  documents.push(describe(rel,e.name,stat.size,types[ext],{...(preview?{preview}:{}),fileVersion,href:'./documents/'+rel.split('/').map(encodeURIComponent).join('/')}));
  const target=path.join('public','documents',...rel.split('/'));await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(p,target);publishedBytes+=stat.size;
 }
}
await walk('documents');
if(publishedBytes>SITE_BYTES)throw Error('Site file storage capacity exceeded.');
documents.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title));
const names=['index.html','navigation.js','admin.js','library.js','items.js','cards.mjs','contact.js','large-files.mjs','vault.mjs','preview.mjs','home-content.mjs'];
const sources=await Promise.all(names.map(name=>fs.readFile('src/'+name,'utf8')));
sources[0]=sources[0].replace(/<!--CUSTOM_CARDS:([a-z]+)-->/g,(_,section)=>Object.entries(items).filter(([id,card])=>card.custom&&card.section===section).map(([id,card])=>cardMarkup(id,card)).join(''));
sources[0]=renderHome(sources[0],JSON.parse(await fs.readFile('home.content.json','utf8')));
const version=createHash('sha256').update(JSON.stringify({documents,config,items})+sources.join('')).digest('hex').slice(0,12);
for(const doc of documents)if(doc.storage!=='chunked')doc.href+='?v='+doc.fileVersion;
const portrait=documents.find(d=>d.item==='profile-photo'&&d.type.startsWith('image/')&&d.storage!=='chunked');if(portrait){const escaped=portrait.href.replaceAll('&','&amp;').replaceAll('\"','&quot;');sources[0]=sources[0].replace('<img id=\"profile-photo\" hidden','<img id=\"profile-photo\" src=\"'+escaped+'\"').replace('<div id=\"profile-placeholder\"','<div id=\"profile-placeholder\" hidden');}
for(let i=0;i<names.length;i++){let text=sources[i];for(const asset of ['navigation.js','admin.js','library.js','items.js','cards.mjs','contact.js','large-files.mjs','vault.mjs','preview.mjs','home-content.mjs','documents.json','config.json'])text=text.replaceAll('./'+asset,'./'+asset+'?v='+version);await fs.writeFile('public/'+names[i],text);}
await fs.cp('src/vendor','public/vendor',{recursive:true});
await fs.writeFile('public/documents.json',JSON.stringify({documents}));
await fs.writeFile('public/config.json',JSON.stringify(config));
await fs.writeFile('public/.nojekyll','');
console.log('Built portfolio with '+documents.length+' documents and individual card attachments.');


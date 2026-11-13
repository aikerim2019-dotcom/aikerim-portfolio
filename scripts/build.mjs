import fs from 'node:fs/promises';
import path from 'node:path';
const config=JSON.parse(await fs.readFile('site.config.json','utf8'));
const meta=JSON.parse(await fs.readFile('documents.meta.json','utf8'));
const items=JSON.parse(await fs.readFile('items.config.json','utf8'));
const sections={home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',documents:'Құжаттар қоры',achievements:'Жетістіктер',students:'Студенттер жетістіктері',contact:'Байланыс'};
const cats={certificates:'Сертификаттар',awards:'Марапаттар',materials:'Әдістемелік материалдар',articles:'Ғылыми мақалалар',students:'Студенттер жетістіктері',other:'Басқа құжаттар'};
const legacySections={certificates:'about',awards:'achievements',materials:'materials',articles:'materials',students:'students',other:'documents'};
const types={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'};
await fs.rm('public',{recursive:true,force:true});
await fs.mkdir('public',{recursive:true});
const documents=[];
async function walk(dir){
 for(const e of await fs.readdir(dir,{withFileTypes:true})){
  const p=path.join(dir,e.name);
  if(e.isDirectory()){await walk(p);continue;}
  const ext=e.name.split('.').pop().toLowerCase();if(!types[ext])continue;
  const rel=path.relative('documents',p).split(path.sep).join('/'),parts=rel.split('/');
  const m=meta[rel]||{},stat=await fs.stat(p);
  const item=parts[0]==='items'&&items[parts[1]]?parts[1]:items[m.item]?m.item:null;
  const section=item?items[item].section:parts[0]==='sections'&&sections[parts[1]]?parts[1]:legacySections[parts[0]]||'documents';
  documents.push({id:rel,title:m.title||e.name.replace(/\.[^.]+$/,'').replaceAll('_',' '),description:m.description||'',year:m.year||e.name.match(/(?:19|20)\d{2}/)?.[0]||'',item,itemTitle:item?items[item].title:'',section,sectionTitle:sections[section],category:cats[parts[0]]||(types[ext].startsWith('image/')?'Фотосуреттер':'Басқа құжаттар'),name:e.name,size:stat.size,type:types[ext],href:'./documents/'+parts.map(encodeURIComponent).join('/')});
  const target=path.join('public','documents',...parts);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(p,target);
 }
}
await walk('documents');
documents.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title));
for(const name of ['index.html','library.js','items.js'])await fs.copyFile('src/'+name,'public/'+name);
await fs.writeFile('public/documents.json',JSON.stringify({documents}));
await fs.writeFile('public/config.json',JSON.stringify(config));
await fs.writeFile('public/.nojekyll','');
console.log('Built portfolio with '+documents.length+' documents and individual card attachments.');

(()=>{
 'use strict';
 const $=s=>document.querySelector(s),types={pdf:'application/pdf',doc:'application/msword',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',ppt:'application/vnd.ms-powerpoint',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'};
 let token='',config=null,records=[],itemMap={},metadata={},pendingAction=null,uploadItem=null,uploadKind='files',uploadBusy=false,deleteBusy=false,deleteDoc=null,live=false,cardBusy=false,newCardSection=null;
 const fileCache=new Map();
 let ownerLogin='',accessBusy=false,personalBusy=false,sessionVersion=0,renewMode=false,homeBusy=false,homeSHA=null;
 const vaultKey='portfolio-personal-vault:v1:'+location.pathname.replace(/\/+$/,'');
 function loadVault(){try{const raw=localStorage.getItem(vaultKey);return raw&&raw.length<15000?JSON.parse(raw):null;}catch{return null;}}
 function saveVault(record){try{localStorage.setItem(vaultKey,JSON.stringify(record));}catch{throw Error('Браузер сақтауға рұқсат бермеді. Баптауын тексеріңіз.');}}
 async function vaultModule(){return import(document.querySelector('script[src*="vault.mjs"]').src);}
 const vaultScope=()=>location.origin+'|'+config.repository;
 function personalUI(){const exists=!!loadVault();$('#personal-login-pane').hidden=!exists;$('#personal-first-setup-note').hidden=exists;$('#github-access-panel').open=!exists||renewMode;$('#renew-password-label').hidden=!renewMode;$('#renew-help').hidden=!renewMode;$('#renew-password').required=renewMode;$('#personal-settings-button').textContent=exists?'Құпиясөзді өзгерту':'Өз құпиясөзімді орнату';}


 const ownerConnected=()=>!!token&&!!ownerLogin;
 function publicRecord(doc){const published=window.getPublishedPortfolioDocuments?.().find(d=>d.id===doc.id);if(published)return published;const {id,title,description,year,name,item,itemTitle,section,sectionTitle,category,size,type,storage}=doc;return {id,title,description,year,name,item,itemTitle,section,sectionTitle,category,size,type,...(storage?{storage}:{})};}
 function hidePrivateContent(){sessionVersion++;ownerLogin='';for(const url of fileCache.values())URL.revokeObjectURL(url);fileCache.clear();records=(live?records:window.getPortfolioDocuments?.()||records).map(publicRecord);live=false;const viewer=$('#doc-viewer');if(viewer?.open)viewer.close();$('#doc-view-body')?.replaceChildren();for(const id of ['doc-open-tab','doc-download'])$('#'+id)?.removeAttribute('href');if(window.setPortfolioDocuments)window.setPortfolioDocuments(records);}
 function requireOwner(){if(!ownerConnected())throw Error('Бұл басқару әрекеті үшін өз аккаунтыңызбен кіріңіз.');}
 const text=(id,message)=>{$(id).textContent=message;};
 const report=message=>text('#admin-global-message',message);
 const from64=value=>new TextDecoder().decode(Uint8Array.from(atob(value.replace(/\s/g,'')),c=>c.charCodeAt(0)));
 const to64=buffer=>{const bytes=new Uint8Array(buffer);let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
 const encodePath=value=>value.split('/').map(encodeURIComponent).join('/');
 function validPath(id){if(typeof id!=='string'||id.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\x00-\x1f]/.test(id))throw Error('Файл жолы жарамсыз.');return 'documents/'+id;}
 async function settings(){if(!config){const r=await fetch('./config.json');if(!r.ok)throw Error('Сайт баптауы ашылмады.');config=await r.json();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository||''))throw Error('Сайт баптауы жарамсыз.');}return config;}
 function connectionUI(login=''){if(!token)hidePrivateContent();else if(login)ownerLogin=login;document.documentElement.dataset.owner=ownerConnected()?'true':'false';$('#admin-login-button').hidden=!!token;$('#admin-logout-button').hidden=!token;$('#admin-refresh-button').hidden=!token;$('#personal-settings-button').hidden=!token||!ownerLogin;$('#admin-logout-button').disabled=uploadBusy||deleteBusy||cardBusy||homeBusy;text('#admin-connection-status',token?'Басқару қосулы: '+ownerLogin:'Файлдарды қосу немесе жою үшін басқаруға кіріңіз.');personalUI();}
 async function api(path,options={}){
  if(!path.startsWith('/'))throw Error('Сұрау жолы жарамсыз.');
  const requestToken=token;const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28',...(token?{Authorization:'Bearer '+token}:{}),...(options.body?{'Content-Type':'application/json'}:{})};
  let r;try{r=await fetch('https://api.github.com'+path,{...options,headers,cache:'no-store'});}catch{throw Error('Интернет байланысы үзілді. Қайта көріңіз.');}
  if(!r.ok){let detail;try{detail=await r.json();}catch{}
   const e=Error(r.status===401?'GitHub кілті жарамсыз немесе мерзімі біткен. Жеке құпиясөздің мерзімі бітпейді. Кілтті жаңартып, бұрынғы құпиясөзді сақтаңыз.':r.status===403?'Бұл кілтке қажетті құқық берілмеген немесе сұрау шегі аяқталған. Contents → Read and write құқығын тексеріңіз.':r.status===409||r.status===422?'Файлдар басқа жерден өзгерген. Тізімді жаңартып, әрекетті қайталаңыз.':r.status===404?'Файл немесе жоба табылмады.':'Сервермен байланыс сәтсіз аяқталды. Қайта көріңіз.');e.status=r.status;if(r.status===401){token='';connectionUI();}throw e;
  }if(token!==requestToken)throw Error('Басқару сеансы аяқталды. Қайта кіріңіз.');return r.status===204?null:r.json();
 }
 const repoPath=()=>'/repos/'+config.repository;
 function publish(next){records=next;window.PortfolioCards?.sync(itemMap);if(window.setPortfolioDocuments)window.setPortfolioDocuments(next);else document.dispatchEvent(new CustomEvent('portfolio-documents-changed',{detail:next}));}
 function currentRecords(){return live?records:window.getPortfolioDocuments?.()||[];}
 function descriptor(path,sha,size){
  const id=path.slice(10),parts=id.split('/'),name=parts.at(-1),ext=name.split('.').pop().toLowerCase(),m=metadata[id]||{},item=parts[0]==='items'&&itemMap[parts[1]]?parts[1]:itemMap[m.item]?m.item:null;
  const legacy={certificates:'about',awards:'achievements',materials:'materials',articles:'materials',students:'students',other:'documents'},section=item?itemMap[item].section:parts[0]==='sections'?parts[1]:legacy[parts[0]]||'documents';
  const sectionTitles={home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',documents:'Құжаттар қоры',achievements:'Жетістіктер',students:'Студенттер жетістіктері',contact:'Байланыс',learning:'Студенттің оқу қоржыны'},categories={certificates:'Сертификаттар',awards:'Марапаттар',materials:'Әдістемелік материалдар',articles:'Ғылыми мақалалар',students:'Студенттер жетістіктері',other:'Басқа құжаттар'};
  return {id,sha,live:true,title:m.title||name.replace(/\.[^.]+$/,'').replaceAll('_',' '),description:m.description||'',year:m.year||name.match(/(?:19|20)\d{2}/)?.[0]||'',name,item,itemTitle:item?itemMap[item].title:'',section,sectionTitle:sectionTitles[section]||section,category:categories[parts[0]]||(types[ext]?.startsWith('image/')?'Фотосуреттер':'Басқа құжаттар'),size,type:types[ext],fileVersion:sha};
 }
 function largeDescriptor(path,sha,manifest){const base=descriptor(path,sha,manifest.size),m=metadata[base.id]||{};return {...base,storage:'chunked',name:manifest.name,title:m.title||manifest.name.replace(/\.[^.]+$/,'').replaceAll('_',' '),size:manifest.size,type:manifest.type,parts:manifest.parts,href:'#'};}
 async function storageModule(){if(!window.PortfolioLargeFiles){const script=document.querySelector('script[src*="large-files.mjs"]');if(!script)throw Error('Сақтау модулі ашылмады.');await import(script.src);}return window.PortfolioLargeFiles;}
 async function readManifest(sha){await storageModule();const result=await api(repoPath()+'/git/blobs/'+encodeURIComponent(sha));return window.PortfolioLargeFiles.normalizeManifest(JSON.parse(from64(result.content)));}
 function progress(doc,value,label='Файл жүктелуде'){const message=label+': '+value+'%';report(doc.name+' — '+message);document.dispatchEvent(new CustomEvent('portfolio-file-progress',{detail:{id:doc.id,message}}));}
 async function readPart(doc,part){requireOwner();if(doc.live){const result=await api(repoPath()+'/git/blobs/'+encodeURIComponent(part.sha));return Uint8Array.from(atob(result.content.replace(/\s/g,'')),c=>c.charCodeAt(0));}throw Error('Файлды ашу үшін басқаруға қайта кіріңіз.');}
 async function snapshot(){
  requireOwner();const version=sessionVersion;await settings();const base=repoPath(),ref=encodeURIComponent(config.branch);
  const [tree,map,meta]=await Promise.all([api(base+'/git/trees/'+ref+'?recursive=1'),api(base+'/contents/items.config.json?ref='+ref),api(base+'/contents/documents.meta.json?ref='+ref)]);
  if(tree.truncated)throw Error('Файлдар тізімі толық алынбады. Қайта жаңартыңыз.');itemMap=JSON.parse(from64(map.content));metadata=JSON.parse(from64(meta.content));document.dispatchEvent(new CustomEvent('portfolio-items-changed',{detail:itemMap}));
  const entries=tree.tree.filter(x=>x.type==='blob'&&x.path.startsWith('documents/')),docs=entries.filter(x=>types[x.path.split('.').pop().toLowerCase()]).map(x=>descriptor(x.path,x.sha,x.size));for(const entry of entries.filter(x=>x.path.endsWith('.portfolio-file.json')))docs.push(largeDescriptor(entry.path,entry.sha,await readManifest(entry.sha)));docs.sort((a,b)=>b.year.localeCompare(a.year)||a.title.localeCompare(b.title));if(version!==sessionVersion||!ownerConnected())throw Error('Басқару сеансы аяқталды.');live=true;publish(docs);return docs;
 }
 function requireAccess(action){if(ownerConnected()){action();return;}pendingAction=action;personalUI();text('#admin-access-message','');text('#personal-login-message','');$('#admin-access-dialog').showModal();$(loadVault()?'#personal-login-password':'#admin-token').focus();}
 function upload(item,kind='files'){
  requireAccess(()=>{if(!document.querySelector('[data-item-id="'+CSS.escape(item)+'"]'))return;if(itemMap[item]?.section)window.PortfolioNavigation?.show(itemMap[item].section);uploadItem=item;uploadKind=kind==='photos'?'photos':'files';$('#admin-upload-form').reset();$('#admin-selected-files').replaceChildren();text('#admin-upload-message','');text('#admin-upload-item',itemMap[item]?.title||'Осы ұяшыққа қосу');$('#admin-files').accept=uploadKind==='photos'?'.jpg,.jpeg,.png,.webp,.gif':'.pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.gif';$('#admin-upload-dialog').showModal();});
 }
 function remove(doc){requireAccess(()=>{const current=currentRecords().find(x=>x.id===doc.id);if(!current){report('Бұл файл бұрын жойылған.');return;}deleteDoc=current;text('#file-delete-name',current.name);text('#file-delete-help','Осы файлды біржола жоясыз ба? Қалған файлдар сақталады.');$('#file-delete-dialog').showModal();});}
 async function fileUrl(doc){
  requireOwner();const version=sessionVersion,current=records.find(x=>x.id===doc.id);if(!current?.live)throw Error('Файлды ашу үшін тізімді жаңартыңыз.');doc=current;
  const key=doc.id+':'+(doc.sha||doc.fileVersion);if(fileCache.has(key))return fileCache.get(key);
  if(doc.storage==='chunked'){await storageModule();const blob=await window.PortfolioLargeFiles.assemble(doc,part=>readPart(doc,part),percent=>progress(doc,percent,'Файл дайындалуда')),url=URL.createObjectURL(blob);if(version!==sessionVersion||!ownerConnected()){URL.revokeObjectURL(url);throw Error('Басқару сеансы аяқталды.');}fileCache.set(key,url);return url;}
  if(!doc.live)throw Error('Файлды ашу үшін басқаруға қайта кіріңіз.');await settings();const result=await api(repoPath()+'/git/blobs/'+encodeURIComponent(doc.sha));if(result.encoding!=='base64')throw Error('Файл мазмұны ашылмады.');const bytes=Uint8Array.from(atob(result.content.replace(/\s/g,'')),c=>c.charCodeAt(0)),url=URL.createObjectURL(new Blob([bytes],{type:doc.type}));if(version!==sessionVersion||!ownerConnected()){URL.revokeObjectURL(url);throw Error('Басқару сеансы аяқталды.');}fileCache.set(key,url);return url;
 }
 async function download(doc,event){
  event?.preventDefault();let writable;
  try{
   requireOwner();const version=sessionVersion,current=records.find(x=>x.id===doc.id);if(!current?.live)throw Error('Файлдар тізімін жаңартыңыз.');doc=current;
   if(doc.storage==='chunked'&&typeof window.showSaveFilePicker==='function'){
    const handle=await window.showSaveFilePicker({suggestedName:doc.name});if(version!==sessionVersion||!ownerConnected())throw Error('Басқару сеансы аяқталды.');writable=await handle.createWritable();await storageModule();await window.PortfolioLargeFiles.consumeParts(doc,part=>readPart(doc,part),percent=>progress(doc,percent),bytes=>writable.write(bytes));await writable.close();writable=null;progress(doc,100,'Файл сақталды');return;
   }
   const url=await fileUrl(doc),a=document.createElement('a');a.href=url;a.download=doc.name;document.body.append(a);a.click();a.remove();report('«'+doc.name+'» файлын жүктеу басталды.');
  }catch(e){if(writable)try{await writable.abort();}catch{}if(e.name!=='AbortError')report(e.message);}
 }
 async function authorize(candidate){await settings();token=candidate;const [user,repo]=await Promise.all([api('/user'),api(repoPath())]);if(user.login.toLowerCase()!==config.repository.split('/')[0].toLowerCase()||repo.permissions?.push!==true)throw Error('Бұл аккаунтқа портфолионы басқаруға рұқсат жоқ.');ownerLogin=user.login;sessionVersion++;await snapshot();connectionUI(user.login);}
 function startRenew(){renewMode=!!loadVault();personalUI();$('#github-access-panel').open=true;text('#admin-access-message','Жаңа GitHub кілтін төменге енгізіңіз. Бұрынғы құпиясөз сақталады.');$('#admin-token').focus();}
 $('#personal-renew-button').onclick=()=>{if(!accessBusy)startRenew();};
 function finishLogin(){renewMode=false;personalUI();$('#admin-access-dialog').close();report('Басқару қосылды. Құжаттарды осы беттен қосып, жоя аласыз.');const action=pendingAction;pendingAction=null;action?.();}
 function accessLock(busy){accessBusy=busy;for(const id of ['admin-connect-submit','admin-access-close','personal-login-submit','personal-login-close','personal-forgot-button'])$('#'+id).disabled=busy;}
 $('#admin-login-button').onclick=()=>requireAccess(()=>{});
 for(const id of ['admin-access-close','personal-login-close'])$('#'+id).onclick=()=>{if(accessBusy)return;pendingAction=null;$('#admin-access-dialog').close();};
 $('#admin-access-dialog').addEventListener('close',()=>{$('#admin-token').value='';$('#personal-login-password').value='';$('#renew-password').value='';});
 $('#admin-access-dialog').addEventListener('cancel',event=>{if(accessBusy)event.preventDefault();else pendingAction=null;});
 $('#admin-access-form').onsubmit=async event=>{
  event.preventDefault();if(accessBusy)return;const candidate=$('#admin-token').value.trim(),oldPassword=$('#renew-password').value;$('#renew-password').value='';$('#admin-token').value='';accessLock(true);text('#admin-access-message','Құқықтар тексерілуде…');
  try{let updated;if(renewMode){await settings();const module=await vaultModule();updated=await module.rebind(loadVault(),oldPassword,candidate,vaultScope());}await authorize(candidate);if(updated)saveVault(updated);renewMode=false;personalUI();finishLogin();}catch(e){token='';connectionUI();$('#github-access-panel').open=true;text('#admin-access-message',e.message);}finally{accessLock(false);}
 };
 $('#personal-login-form').onsubmit=async event=>{
  event.preventDefault();if(accessBusy)return;const password=$('#personal-login-password').value;$('#personal-login-password').value='';accessLock(true);text('#personal-login-message','Кіру тексерілуде…');
  try{await settings();const module=await vaultModule();await authorize(await module.unlock(loadVault(),password,vaultScope()));finishLogin();}catch(e){token='';connectionUI();text('#personal-login-message',e.message);if(e.status===401)startRenew();}finally{accessLock(false);}
 };
 $('#admin-logout-button').onclick=()=>{if(uploadBusy||deleteBusy||cardBusy||personalBusy||homeBusy)return;token='';pendingAction=null;connectionUI();report('Басқарудан шықтыңыз.');};
 function showCode(code){$('#personal-recovery-code').value=code;text('#personal-code-message','Жаңа кодты сақтап алыңыз. Бұрынғы код енді жарамайды.');$('#personal-code-dialog').showModal();}
 function matchingPassword(first,second){const password=$(first).value;if(password!==$(second).value)throw Error('Екі құпиясөз сәйкес келмейді.');if(password.length<10||password.length>128)throw Error('Құпиясөз 10–128 таңбадан тұруы керек.');return password;}
 function personalLock(busy){personalBusy=busy;for(const id of ['personal-settings-save','personal-settings-close','personal-recovery-save','personal-recovery-close','personal-no-recovery'])$('#'+id).disabled=busy;$('#admin-logout-button').disabled=busy||uploadBusy||deleteBusy||cardBusy||homeBusy;}
 $('#personal-settings-button').onclick=()=>{if(personalBusy||uploadBusy||deleteBusy||cardBusy)return;requireAccess(()=>{if(!ownerLogin)return;$('#personal-settings-form').reset();text('#personal-settings-message','');$('#personal-settings-dialog').showModal();$('#personal-new-password').focus();});};
 $('#personal-settings-form').onsubmit=async event=>{
  event.preventDefault();if(personalBusy||!token||!ownerLogin)return;let password;try{password=matchingPassword('#personal-new-password','#personal-confirm-password');}catch(e){text('#personal-settings-message',e.message);return;}personalLock(true);text('#personal-settings-message','Құпиясөз сақталуда…');
  try{const module=await vaultModule(),result=await module.seal(token,password,vaultScope());if(!token||!ownerLogin)throw Error('Қайта кіріңіз.');saveVault(result.record);personalUI();$('#personal-settings-dialog').close();showCode(result.recoveryCode);report('Жеке құпиясөз сақталды. Келесі жолы осы құпиясөзбен кіріңіз.');}catch(e){text('#personal-settings-message',e.message);}finally{personalLock(false);}
 };
 $('#personal-forgot-button').onclick=()=>{if(accessBusy)return;$('#admin-access-dialog').close();$('#personal-recovery-form').reset();text('#personal-recovery-message','');$('#personal-recovery-dialog').showModal();$('#personal-recovery-input').focus();};
 $('#personal-recovery-form').onsubmit=async event=>{
  event.preventDefault();if(personalBusy)return;let password;try{password=matchingPassword('#personal-reset-password','#personal-reset-confirm');}catch(e){text('#personal-recovery-message',e.message);return;}const code=$('#personal-recovery-input').value;personalLock(true);text('#personal-recovery-message','Құпиясөз ауыстырылуда…');
  try{await settings();const module=await vaultModule(),result=await module.reset(loadVault(),code,password,vaultScope());saveVault(result.record);personalUI();$('#personal-recovery-dialog').close();showCode(result.recoveryCode);report('Құпиясөз ауыстырылды. Енді жаңа құпиясөзбен кіріңіз.');}catch(e){text('#personal-recovery-message',e.message);}finally{personalLock(false);}
 };
 for(const kind of ['settings','recovery']){const dialog=$('#personal-'+kind+'-dialog');$('#personal-'+kind+'-close').onclick=()=>{if(!personalBusy)dialog.close();};dialog.addEventListener('cancel',event=>{if(personalBusy)event.preventDefault();});dialog.addEventListener('close',()=>$('#personal-'+kind+'-form').reset());}
 $('#personal-no-recovery').onclick=()=>{if(personalBusy)return;$('#personal-recovery-dialog').close();requireAccess(pendingAction||(()=>{}));$('#github-access-panel').open=true;$('#admin-token').focus();};
 $('#personal-code-close').onclick=()=>$('#personal-code-dialog').close();
 $('#personal-code-dialog').addEventListener('close',()=>{$('#personal-recovery-code').value='';});
 $('#personal-copy-code').onclick=async()=>{try{await navigator.clipboard.writeText($('#personal-recovery-code').value);text('#personal-code-message','Код көшірілді. Қауіпсіз жерге сақтаңыз.');}catch{text('#personal-code-message','Кодты таңдап, қолмен көшіріңіз.');$('#personal-recovery-code').select();}};
 $('#personal-download-code').onclick=()=>{const url=URL.createObjectURL(new Blob(['Портфолио: '+location.origin+location.pathname+'\nҚалпына келтіру коды: '+$('#personal-recovery-code').value+'\nБұл кодты ешкімге бермеңіз.'],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='portfolio-recovery-code.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 window.addEventListener('storage',event=>{if(event.key===vaultKey){token='';connectionUI();report('Кіру баптауы басқа терезеде өзгерді. Қайта кіріңіз.');}});
 personalUI();document.documentElement.dataset.owner='false';
 $('#admin-refresh-button').onclick=async()=>{if(!token||uploadBusy||deleteBusy||cardBusy)return;const b=$('#admin-refresh-button');b.disabled=true;try{await snapshot();report('Файлдар тізімі жаңартылды.');}catch(e){report(e.message);}finally{b.disabled=false;}};
 $('#admin-files').onchange=()=>{const list=$('#admin-selected-files');list.replaceChildren();for(const file of $('#admin-files').files){const li=document.createElement('li');li.textContent=file.name+' · '+(file.size/1024/1024).toFixed(2)+' МБ';list.append(li);}};
 $('#admin-upload-close').onclick=()=>{if(!uploadBusy)$('#admin-upload-dialog').close();};
 $('#admin-upload-dialog').addEventListener('cancel',e=>{if(uploadBusy)e.preventDefault();});
 $('#admin-upload-form').onsubmit=async event=>{
  event.preventDefault();if(!token||uploadBusy)return;const selected=[...$('#admin-files').files];
  try{if(!selected.length)throw Error('Бір немесе бірнеше файл таңдаңыз.');if(selected.reduce((n,f)=>n+f.size,0)>500*1024*1024)throw Error('Бір жүктеудегі файлдар көлемі 500 МБ-тан аспауы керек.');for(const f of selected){if(!f.size||f.size>500*1024*1024)throw Error(f.name+': көлемі 500 МБ-тан аспайтын бос емес файл таңдаңыз.');if(!types[f.name.split('.').pop().toLowerCase()]||(uploadKind==='photos'&&!types[f.name.split('.').pop().toLowerCase()].startsWith('image/')))throw Error(f.name+': бұл файл түріне қолдау жоқ.');if(/[\\/\x00-\x1f]/.test(f.name)||new TextEncoder().encode(f.name).length>220)throw Error('Файл атауы жарамсыз немесе тым ұзын.');}}
  catch(e){text('#admin-upload-message',e.message);return;}
  uploadBusy=true;$('#admin-upload-submit').disabled=true;$('#admin-upload-close').disabled=true;$('#admin-logout-button').disabled=true;text('#admin-upload-message','Файлдар дайындалуда…');
  let saved=false;const pendingCacheKeys=[];
  try{
   const base=repoPath(),ref=await api(base+'/git/ref/heads/'+encodeURIComponent(config.branch)),commit=await api(base+'/git/commits/'+ref.object.sha),tree=await api(base+'/git/trees/'+commit.tree.sha+'?recursive=1');if(tree.truncated)throw Error('Жоба файлдарының тізімі толық емес.');
   const storage=await storageModule();const occupied=tree.tree.filter(x=>x.type==='blob'&&(x.path.startsWith('documents/')||x.path.startsWith('file-parts/'))).reduce((n,x)=>n+(x.size||0),0);if(occupied+selected.reduce((n,f)=>n+f.size,0)+1024*1024>storage.SITE_BYTES)throw Error('Сайттағы файлдарға арналған орын жеткіліксіз. Қажет емес ірі файлдарды жойып, қайта көріңіз.');
   const used=new Set(tree.tree.map(x=>x.path)),changes=[],newDocs=[];
   for(let i=0;i<selected.length;i++){
    const file=selected[i],original=file.name.normalize('NFC'),dot=original.lastIndexOf('.'),stem=original.slice(0,dot),ext=original.slice(dot),folder='documents/items/'+uploadItem+'/'+uploadKind+'/';let name=original,n=2;while(used.has(folder+name)||used.has(folder+name+storage.MANIFEST_SUFFIX))name=stem+' ('+(n++)+')'+ext;const path=folder+name;used.add(path);
    text('#admin-upload-message',(i+1)+' / '+selected.length+' файл жүктелуде: '+name);
    if(file.size>storage.CHUNK_BYTES){const parts=[],group=crypto.randomUUID();for(let offset=0,index=0;offset<file.size;offset+=storage.CHUNK_BYTES,index++){const bytes=await file.slice(offset,Math.min(offset+storage.CHUNK_BYTES,file.size)).arrayBuffer(),sha256=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join(''),partPath='file-parts/'+group+'/'+String(index).padStart(5,'0')+'.part';text('#admin-upload-message',(i+1)+' / '+selected.length+' файл: '+name+' — '+Math.round(offset/file.size*100)+'%');const blob=await api(base+'/git/blobs',{method:'POST',body:JSON.stringify({content:to64(bytes),encoding:'base64'})});parts.push({path:partPath,sha:blob.sha,sha256,size:bytes.byteLength});changes.push({path:partPath,mode:'100644',type:'blob',sha:blob.sha});}
     const manifest=storage.normalizeManifest({version:1,name,type:types[original.split('.').pop().toLowerCase()],size:file.size,parts}),manifestPath=path+storage.MANIFEST_SUFFIX,blob=await api(base+'/git/blobs',{method:'POST',body:JSON.stringify({content:to64(new TextEncoder().encode(JSON.stringify(manifest)).buffer),encoding:'base64'})});used.add(manifestPath);changes.push({path:manifestPath,mode:'100644',type:'blob',sha:blob.sha});newDocs.push(largeDescriptor(manifestPath,blob.sha,manifest));
    }else{const blob=await api(base+'/git/blobs',{method:'POST',body:JSON.stringify({content:to64(await file.arrayBuffer()),encoding:'base64'})});changes.push({path,mode:'100644',type:'blob',sha:blob.sha});const doc=descriptor(path,blob.sha,file.size);newDocs.push(doc);fileCache.set(doc.id+':'+doc.sha,URL.createObjectURL(new Blob([file],{type:doc.type})));pendingCacheKeys.push(doc.id+':'+doc.sha);}
   }
   const updated=await api(base+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:changes})}),next=await api(base+'/git/commits',{method:'POST',body:JSON.stringify({message:'Add '+selected.length+' portfolio files to '+uploadItem,tree:updated.sha,parents:[ref.object.sha]})});
   await api(base+'/git/refs/heads/'+encodeURIComponent(config.branch),{method:'PATCH',body:JSON.stringify({sha:next.sha,force:false})});saved=true;publish([...records,...newDocs]);$('#admin-upload-dialog').close();report(selected.length+' файл сақталды және осы ұяшықта көрсетілді. Келушілер сайт жаңартылғаннан кейін материалдарды көре алады.');
  }catch(e){text('#admin-upload-message',saved?'Файлдар сақталды. Тізімді жаңартыңыз.':e.message);}
  finally{if(!saved)for(const key of pendingCacheKeys){URL.revokeObjectURL(fileCache.get(key));fileCache.delete(key);}uploadBusy=false;$('#admin-upload-submit').disabled=false;$('#admin-upload-close').disabled=false;$('#admin-logout-button').disabled=false;}
 };
 $('#file-delete-cancel').onclick=()=>{if(!deleteBusy)$('#file-delete-dialog').close();};
 $('#file-delete-dialog').addEventListener('cancel',e=>{if(deleteBusy)e.preventDefault();});
 $('#file-delete-confirm').onclick=async()=>{
  if(!token||!deleteDoc||deleteBusy)return;deleteBusy=true;$('#file-delete-confirm').disabled=true;$('#file-delete-cancel').disabled=true;$('#admin-logout-button').disabled=true;text('#file-delete-help','Файл жойылуда…');
  try{const path=validPath(deleteDoc.id),current=await api(repoPath()+'/contents/'+encodePath(path)+'?ref='+encodeURIComponent(config.branch));if(deleteDoc.sha&&current.sha!==deleteDoc.sha)throw Error('Бұл файл өзгерген. Тізімді жаңартып, жоюды қайта растаңыз.');if(deleteDoc.storage==='chunked'){await storageModule();
    const ref=await api(repoPath()+'/git/ref/heads/'+encodeURIComponent(config.branch)),commit=await api(repoPath()+'/git/commits/'+ref.object.sha),tree=await api(repoPath()+'/git/trees/'+commit.tree.sha+'?recursive=1');if(tree.truncated)throw Error('Файлдар тізімі толық алынбады.');const found=tree.tree.find(x=>x.path===path);if(found?.sha!==current.sha)throw Error('Файл өзгерген. Тізімді жаңартыңыз.');const manifest=window.PortfolioLargeFiles.normalizeManifest({version:1,name:deleteDoc.name,type:deleteDoc.type,size:deleteDoc.size,parts:deleteDoc.parts}),existing=new Set(tree.tree.map(x=>x.path)),changes=[path,...manifest.parts.map(x=>x.path)].filter(p=>existing.has(p)).map(p=>({path:p,mode:'100644',type:'blob',sha:null}));const updated=await api(repoPath()+'/git/trees',{method:'POST',body:JSON.stringify({base_tree:commit.tree.sha,tree:changes})}),next=await api(repoPath()+'/git/commits',{method:'POST',body:JSON.stringify({message:'Delete large portfolio file '+deleteDoc.name,tree:updated.sha,parents:[ref.object.sha]})});await api(repoPath()+'/git/refs/heads/'+encodeURIComponent(config.branch),{method:'PATCH',body:JSON.stringify({sha:next.sha,force:false})});
   }else await api(repoPath()+'/contents/'+encodePath(path),{method:'DELETE',body:JSON.stringify({message:'Delete portfolio file '+deleteDoc.name,sha:current.sha,branch:config.branch})});publish(records.filter(x=>x.id!==deleteDoc.id));$('#file-delete-dialog').close();if($('#doc-viewer').open)$('#doc-viewer').close();report('«'+deleteDoc.name+'» файлы жойылды. Қалған файлдар сақталды.');deleteDoc=null;}
  catch(e){text('#file-delete-help',e.message);}finally{deleteBusy=false;$('#file-delete-confirm').disabled=false;$('#file-delete-cancel').disabled=false;$('#admin-logout-button').disabled=false;}
 };

 const cardSections={home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',documents:'Құжаттар қоры',learning:'Студенттің оқу қоржыны',achievements:'Жетістіктер',students:'Студенттер жетістіктері',contact:'Байланыс'};
 function createCard(section){if(!cardSections[section])return;requireAccess(()=>{window.PortfolioNavigation?.show(section);newCardSection=section;$('#new-card-form').reset();text('#new-card-section',cardSections[section]+' бөлімі');text('#new-card-subtitle-label',section==='students'?'Студенттің аты-жөні (міндетті емес)':'Қосымша атау (міндетті емес)');text('#new-card-message','');$('#new-card-dialog').showModal();$('#new-card-name').focus();});}
 for(const button of document.querySelectorAll('[data-section-add]'))button.onclick=()=>createCard(button.dataset.sectionAdd);
 $('#new-card-cancel').onclick=()=>{if(!cardBusy)$('#new-card-dialog').close();};
 $('#new-card-dialog').addEventListener('cancel',event=>{if(cardBusy)event.preventDefault();});
 $('#new-card-form').onsubmit=async event=>{
  event.preventDefault();if(!token||cardBusy||!cardSections[newCardSection])return;
  const data=new FormData(event.currentTarget),title=String(data.get('title')||'').trim(),subtitle=String(data.get('subtitle')||'').trim(),description=String(data.get('description')||'').trim(),year=String(data.get('year')||'').trim();
  if(!title||title.length>180||subtitle.length>150||description.length>3000||(year&&(!/^\d{4}$/.test(year)||+year<1950||+year>2100))){text('#new-card-message','Атауын, сипаттамасын және жылын тексеріңіз.');return;}
  cardBusy=true;$('#new-card-save').disabled=true;$('#new-card-cancel').disabled=true;$('#admin-logout-button').disabled=true;text('#new-card-message','Ұяшық сақталуда…');
  try{const current=await api(repoPath()+'/contents/items.config.json?ref='+encodeURIComponent(config.branch)),items=JSON.parse(from64(current.content));let id;do{id='custom-'+newCardSection+'-'+Date.now().toString(36)+'-'+crypto.randomUUID().slice(0,8);}while(items[id]);
   items[id]={section:newCardSection,title,subtitle,description,year,custom:true,createdAt:new Date().toISOString()};
   await api(repoPath()+'/contents/items.config.json',{method:'PUT',body:JSON.stringify({message:'Add portfolio card in '+newCardSection,content:to64(new TextEncoder().encode(JSON.stringify(items,null,2)+'\n').buffer),sha:current.sha,branch:config.branch})});
   itemMap=items;document.dispatchEvent(new CustomEvent('portfolio-items-changed',{detail:itemMap}));publish(records);$('#new-card-dialog').close();report('«'+title+'» ұяшығы сақталды. Енді оған бірнеше файл қосуға болады.');document.querySelector('[data-custom-item="'+CSS.escape(id)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});
  }catch(e){text('#new-card-message',e.message);}finally{cardBusy=false;$('#new-card-save').disabled=false;$('#new-card-cancel').disabled=false;$('#admin-logout-button').disabled=false;}
 };


 async function homeModule(){return import('./home-content.mjs');}
 function applyHome(values){for(const [key,value] of Object.entries(values)){const node=document.querySelector('[data-home-text="'+key+'"]');if(node)node.textContent=value;}}
 function homeLock(busy){homeBusy=busy;$('#home-editor-save').disabled=busy;$('#home-editor-cancel').disabled=busy;$('#admin-logout-button').disabled=busy;}
 async function editHome(){
  requireOwner();window.PortfolioNavigation?.show('home');$('#home-editor-fields').replaceChildren();text('#home-editor-message','Мәтіндер ашылуда…');$('#home-editor-dialog').showModal();homeLock(true);
  try{const module=await homeModule();let saved={};homeSHA=null;try{const file=await api(repoPath()+'/contents/home.content.json?ref='+encodeURIComponent(config.branch));saved=module.normalizeHome(JSON.parse(from64(file.content)));homeSHA=file.sha;}catch(e){if(e.status!==404)throw e;}
   requireOwner();for(const [key,label,max] of module.homeFields){const wrapper=document.createElement('label'),input=document.createElement(key==='intro'?'textarea':'input');wrapper.textContent=label;input.name=key;input.id='home-field-'+key;input.required=true;input.maxLength=max;if(key==='intro')input.rows=6;input.value=saved[key]??document.querySelector('[data-home-text="'+key+'"]').textContent.trim();wrapper.htmlFor=input.id;wrapper.append(input);$('#home-editor-fields').append(wrapper);}text('#home-editor-message','');
  }catch(e){text('#home-editor-message',e.message);}finally{homeLock(false);$('#home-editor-save').disabled=!$('#home-editor-fields').children.length;}
 }
 $('#home-edit-button').onclick=()=>requireAccess(()=>{editHome();});
 $('#home-editor-cancel').onclick=()=>{if(!homeBusy)$('#home-editor-dialog').close();};
 $('#home-editor-dialog').addEventListener('cancel',event=>{if(homeBusy)event.preventDefault();});
 $('#home-editor-form').onsubmit=async event=>{
  event.preventDefault();if(homeBusy)return;homeLock(true);text('#home-editor-message','Сақталуда…');
  try{requireOwner();const module=await homeModule(),values=module.normalizeHome(Object.fromEntries(new FormData($('#home-editor-form')))),result=await api(repoPath()+'/contents/home.content.json',{method:'PUT',body:JSON.stringify({message:'Update homepage text',content:to64(new TextEncoder().encode(JSON.stringify(values,null,2)+'\n')),branch:config.branch,...(homeSHA?{sha:homeSHA}:{})})});homeSHA=result.content.sha;applyHome(values);$('#home-editor-dialog').close();report('Басты бет мәтіндері сақталды. Жариялау аяқталған соң өзгерістер барлығына көрінеді.');
  }catch(e){text('#home-editor-message',e.message);}finally{homeLock(false);}
 };

 window.PortfolioAdmin={createCard,upload,remove,fileUrl,download,thumbnail:doc=>ownerConnected()?fileCache.get(doc.id+':'+doc.sha):undefined,manage:item=>requireAccess(()=>{if(itemMap[item]?.section)window.PortfolioNavigation?.show(itemMap[item].section);report('Осы ұяшықтағы әр файлдың «Жою» батырмасын пайдаланыңыз немесе жаңа файлдар қосыңыз.');document.querySelector('[data-item-id="'+CSS.escape(item)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});}),get itemDefinitions(){return itemMap;},get hasLiveData(){return live;},get connected(){return ownerConnected();}};
 window.addEventListener('beforeunload',()=>{token='';for(const url of fileCache.values())URL.revokeObjectURL(url);fileCache.clear();});
})();

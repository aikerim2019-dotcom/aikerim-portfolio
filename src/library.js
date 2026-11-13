(()=>{let docs=[];const $=s=>document.querySelector(s),status=$('#doc-status');
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};const url=d=>d.href;function show(message,error=false){status.textContent=message;status.classList.toggle('error',error)}
function render(){const list=$('#doc-list');list.replaceChildren();const q=$('#doc-search').value.toLocaleLowerCase(),cat=$('#doc-filter').value;const filtered=docs.filter(d=>(!cat||d.category===cat)&&[d.title,d.description,d.name,d.year,d.sectionTitle,d.itemTitle].join(' ').toLocaleLowerCase().includes(q));for(const d of filtered){const card=make('article','doc-card'),top=make('div','doc-card-top');top.append(make('span','doc-tag',d.category),make('span','doc-file-type',d.name.split('.').pop().toUpperCase()));if(d.type.startsWith('image/')){const photo=make('img','library-photo');photo.src=d.href;photo.alt=d.title;photo.loading='lazy';card.append(photo)}card.append(top,make('h3','',d.title),make('p','',d.description||d.name),make('p','',d.year+' · '+(d.size/1024/1024).toFixed(2)+' МБ'));const actions=make('div','doc-actions'),open=make('button','doc-btn','Ашу');open.type='button';open.onclick=()=>view(d);const dl=make('a','doc-btn doc-secondary','Жүктеп алу');dl.href=url(d);dl.download=d.name;const del=make('button','doc-btn doc-danger','Жою');del.type='button';del.setAttribute('aria-label',d.name+' файлын жою');del.onclick=()=>window.requestPortfolioDelete(d);actions.append(open,dl,del);card.append(actions);list.append(card)}show(filtered.length?filtered.length+' құжат табылды.':'Құжат табылмады.');}
function view(d){$('#doc-view-title').textContent=d.title;const body=$('#doc-view-body');body.replaceChildren();if(d.type==='application/pdf'){const frame=make('iframe');frame.title=d.title;frame.src=url(d);body.append(frame)}else if(d.type.startsWith('image/')){const img=make('img');img.alt=d.title;img.src=url(d);body.append(img)}else body.append(make('p','doc-notice','Бұл файлды жүктеп алып, Word немесе PowerPoint бағдарламасында аша аласыз.'));$('#doc-open-tab').href=url(d);$('#doc-download').href=url(d);$('#doc-download').download=d.name;$('#doc-delete').onclick=()=>window.requestPortfolioDelete(d);$('#doc-viewer').showModal()}


let deleteConfig;
window.requestPortfolioDelete=async doc=>{
 const dialog=$('#file-delete-dialog'),confirm=$('#file-delete-confirm'),help=$('#file-delete-help');
 $('#file-delete-name').textContent=doc.name;confirm.hidden=true;confirm.removeAttribute('href');help.textContent='Жоюды GitHub-та өз аккаунтыңызбен растау қажет. Басқа файлдар сақталады.';if(!dialog.open)dialog.showModal();
 try{if(!deleteConfig){const r=await fetch('./config.json');if(!r.ok)throw Error();deleteConfig=await r.json();}if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(deleteConfig.repository||'')||!doc.id||doc.id.split('/').some(p=>p==='..'||p==='.'||!p))throw Error();
 confirm.href='https://github.com/'+deleteConfig.repository+'/delete/'+encodeURIComponent(deleteConfig.branch)+'/documents/'+doc.id.split('/').map(encodeURIComponent).join('/');confirm.hidden=false;
 }catch{help.textContent='Жою сілтемесін ашу сәтсіз аяқталды. Бетті жаңартып көріңіз.';}
};
$('#file-delete-cancel').onclick=()=>$('#file-delete-dialog').close();
$('#file-delete-refresh').onclick=()=>location.reload();

window.openPortfolioDocument=view;
$('#doc-search').oninput=render;$('#doc-filter').onchange=render;$('#doc-close').onclick=()=>$('#doc-viewer').close();$('#doc-viewer').addEventListener('close',()=>$('#doc-view-body').replaceChildren());
(async()=>{try{const r=await fetch('./documents.json');if(!r.ok)throw Error();docs=(await r.json()).documents;render()}catch{show('Құжаттар тізімі ашылмады. Бетті жаңартып көріңіз.',true)}})();})();

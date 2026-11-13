(()=>{
 let docs=[];const $=s=>document.querySelector(s),status=$('#doc-status');
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const show=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error);};
 function render(){
  const list=$('#doc-list');list.replaceChildren();const q=$('#doc-search').value.toLocaleLowerCase(),category=$('#doc-filter').value;
  const filtered=docs.filter(d=>(!category||d.category===category)&&[d.title,d.description,d.name,d.year,d.sectionTitle,d.itemTitle].join(' ').toLocaleLowerCase().includes(q));
  for(const d of filtered){
   const card=make('article','doc-card'),top=make('div','doc-card-top');top.append(make('span','doc-tag',d.category),make('span','doc-file-type',d.name.split('.').pop().toUpperCase()));
   if(d.type.startsWith('image/')){const photo=make('img','library-photo');photo.src=window.PortfolioAdmin.thumbnail(d);photo.alt=d.title;photo.loading='lazy';card.append(photo);}
   card.append(top,make('h3','',d.title),make('p','',d.description||d.name),make('p','',(d.year?d.year+' · ':'')+(d.size/1024/1024).toFixed(2)+' МБ'));
   const actions=make('div','doc-actions'),open=make('button','doc-btn','Ашу'),download=make('a','doc-btn doc-secondary','Жүктеп алу'),del=make('button','doc-btn doc-danger','Жою');
   open.type=del.type='button';open.onclick=()=>view(d);download.href=d.href;download.download=d.name;download.onclick=e=>window.PortfolioAdmin.download(d,e);del.setAttribute('aria-label',d.name+' файлын жою');del.onclick=()=>window.requestPortfolioDelete(d);actions.append(open,download,del);card.append(actions);list.append(card);
  }show(filtered.length?filtered.length+' құжат табылды.':'Құжат табылмады.');
 }
 async function view(d){
  try{const url=await window.PortfolioAdmin.fileUrl(d);$('#doc-view-title').textContent=d.title;const body=$('#doc-view-body');body.replaceChildren();
   if(d.type==='application/pdf'){const frame=make('iframe');frame.title=d.title;frame.src=url;body.append(frame);}else if(d.type.startsWith('image/')){const img=make('img');img.alt=d.title;img.src=url;body.append(img);}else body.append(make('p','doc-notice','Бұл файлды жүктеп алып, Word немесе PowerPoint бағдарламасында аша аласыз.'));
   $('#doc-open-tab').href=url;$('#doc-download').href=url;$('#doc-download').download=d.name;$('#doc-download').onclick=e=>window.PortfolioAdmin.download(d,e);$('#doc-delete').onclick=()=>window.requestPortfolioDelete(d);$('#doc-viewer').showModal();
  }catch(e){show(e.message,true);}
 }
 window.requestPortfolioDelete=doc=>window.PortfolioAdmin.remove(doc);
 window.openPortfolioDocument=view;
 window.getPortfolioDocuments=()=>docs.slice();
 window.setPortfolioDocuments=next=>{docs=next;render();document.dispatchEvent(new CustomEvent('portfolio-documents-changed',{detail:docs}));};
 $('#doc-search').oninput=render;$('#doc-filter').onchange=render;$('#doc-close').onclick=()=>$('#doc-viewer').close();$('#doc-viewer').addEventListener('close',()=>$('#doc-view-body').replaceChildren());
 (async()=>{try{const r=await fetch('./documents.json');if(!r.ok)throw Error();const data=await r.json();if(!window.PortfolioAdmin.hasLiveData)window.setPortfolioDocuments(data.documents);}catch{show('Құжаттар тізімі ашылмады. Бетті жаңартып көріңіз.',true);}})();
})();

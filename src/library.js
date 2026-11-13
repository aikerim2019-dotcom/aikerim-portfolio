(()=>{
 let docs=[],published=[],preview=null,viewVersion=0;const publicUrls=new Map(),$=s=>document.querySelector(s),status=$('#doc-status');
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 const show=(message,error=false)=>{status.textContent=message;status.classList.toggle('error',error);};
 const catalogReady=fetch('./documents.json').then(async r=>{if(!r.ok)throw Error();published=(await r.json()).documents;return published;});
 function documentLabel(doc){return (doc.type.startsWith('image/')?'Фотосурет':'Құжат')+' '+(docs.findIndex(entry=>entry.id===doc.id)+1);}
 function catalogDoc(doc){return published.find(d=>d.id===doc.id);}
 async function previewUrl(doc){
  await catalogReady;const entry=catalogDoc(doc);if(!entry)throw Error('Бұл материалдың көрінісі сайт жаңартылғаннан кейін дайын болады.');
  if(entry.preview)return new URL(entry.preview,location.href).href;
  if(entry.storage!=='chunked'){if(!entry.href)throw Error('Көрініс әзірге дайын емес.');return new URL(entry.href,location.href).href;}
  if(publicUrls.has(entry.id))return publicUrls.get(entry.id);if(!window.PortfolioLargeFiles)await import(document.querySelector('script[src*="large-files.mjs"]').src);
  const blob=await window.PortfolioLargeFiles.assemble(entry,async part=>{const response=await fetch(part.href);if(!response.ok)throw Error('Файл бөлігі ашылмады.');return response.arrayBuffer();},percent=>document.dispatchEvent(new CustomEvent('portfolio-file-progress',{detail:{id:entry.id,message:'Көрініс дайындалуда: '+percent+'%'}}))),url=URL.createObjectURL(blob);publicUrls.set(entry.id,url);return url;
 }
 function imageSource(image,doc){image.draggable=false;image.oncontextmenu=event=>event.preventDefault();const request=String((Number(image.dataset.imageRequest)||0)+1);image.dataset.imageRequest=request;const owner=window.PortfolioAdmin.connected;(owner?window.PortfolioAdmin.fileUrl(doc):previewUrl(doc)).then(url=>{if(image.isConnected&&image.dataset.imageRequest===request){image.src=url;image.hidden=false;}}).catch(()=>{if(image.dataset.imageRequest===request)image.hidden=true;});}
 function render(){
  const list=$('#doc-list');list.replaceChildren();const owner=window.PortfolioAdmin.connected,q=$('#doc-search').value.toLocaleLowerCase(),category=$('#doc-filter').value;
  const filtered=docs.filter(d=>(!category||d.category===category)&&[documentLabel(d),d.description,d.year,d.sectionTitle,d.itemTitle].join(' ').toLocaleLowerCase().includes(q));
  for(const d of filtered){const card=make('article','doc-card'),top=make('div','doc-card-top');card.dataset.fileId=d.id;top.append(make('span','doc-tag',d.category),make('span','doc-file-type',d.name.split('.').pop().toUpperCase()));card.append(top,make('h3','',documentLabel(d)),make('p','',d.description||d.itemTitle||''),make('p','',d.year||''));
   const details=make('details','archive-details'),summary=make('summary','archive-summary','Толығырақ');details.append(summary);
   if(d.type.startsWith('image/')&&d.storage!=='chunked'){const photo=make('img','library-photo');imageSource(photo,d);photo.alt=documentLabel(d);photo.loading='lazy';details.append(photo);}
   const actions=make('div','doc-actions'),open=make('button','doc-btn','Көру');open.type='button';open.onclick=()=>view(d);actions.append(open);
   if(owner){const del=make('button','doc-btn doc-danger','Жою');del.type='button';del.setAttribute('aria-label',documentLabel(d)+' жою');del.onclick=()=>window.requestPortfolioDelete(d);actions.append(del);}
   details.append(actions,make('p','file-progress'));card.append(details);card.addEventListener('click',event=>{if(event.defaultPrevented||event.target.closest('a,button,input,details,summary')||window.getSelection()?.toString())return;details.open=!details.open;});list.append(card);
  }show(filtered.length?filtered.length+' құжат табылды.':'Құжат табылмады.');
 }
 async function view(d){
  const version=++viewVersion,owner=window.PortfolioAdmin.connected;preview?.dispose();preview=null;$('#doc-view-body').replaceChildren();$('#doc-view-title').textContent=documentLabel(d);
  $('#doc-delete').hidden=!owner;$('#doc-delete').onclick=owner?()=>window.requestPortfolioDelete(d):null;
  if(!$('#doc-viewer').open)$('#doc-viewer').showModal();
  const notice=make('p','portfolio-preview-status','Құжат ашылуда…');$('#doc-view-body').append(notice);
  try{
   const publicEntry=catalogDoc(d),isOffice=/\.(docx?|pptx?)$/i.test(d.name),url=owner&&!isOffice?await window.PortfolioAdmin.fileUrl(d):await previewUrl(d);if(version!==viewVersion||!$('#doc-viewer').open)return;
   if(!window.PortfolioPreview)await import(document.querySelector('script[src*="preview.mjs"]').src);if(version!==viewVersion||!$('#doc-viewer').open)return;
   preview=window.PortfolioPreview.create($('#doc-view-body'));preview.open(url,isOffice&&publicEntry?.preview?'application/pdf':d.type);

  }catch(e){if(version===viewVersion){notice.textContent=e.message;show(e.message,true);}}
 }
 document.addEventListener('keydown',event=>{if($('#doc-viewer').open&&(event.ctrlKey||event.metaKey)&&['s','p'].includes(event.key.toLowerCase()))event.preventDefault();});
 document.addEventListener('portfolio-file-progress',event=>{for(const row of document.querySelectorAll('[data-file-id="'+CSS.escape(event.detail.id)+'"]')){const target=row.querySelector('.file-progress');if(target)target.textContent=event.detail.message;}});
 window.requestPortfolioDelete=doc=>window.PortfolioAdmin.remove(doc);window.openPortfolioDocument=view;
 window.getPortfolioDocuments=()=>docs.slice();window.getPublishedPortfolioDocuments=()=>published.slice();window.portfolioPreviewUrl=previewUrl;window.portfolioImageSource=imageSource;
 window.setPortfolioDocuments=next=>{docs=next;render();document.dispatchEvent(new CustomEvent('portfolio-documents-changed',{detail:docs}));};
 $('#doc-search').oninput=render;$('#doc-filter').onchange=render;$('#doc-close').onclick=()=>$('#doc-viewer').close();$('#doc-viewer').addEventListener('close',()=>{if($('#doc-viewer').open)return;viewVersion++;preview?.dispose();preview=null;$('#doc-view-body').replaceChildren();});
 catalogReady.then(data=>{if(!window.PortfolioAdmin.hasLiveData)window.setPortfolioDocuments(data);}).catch(()=>show('Құжаттар тізімі ашылмады. Бетті жаңартып көріңіз.',true));
 window.addEventListener('beforeunload',()=>{preview?.dispose();for(const url of publicUrls.values())URL.revokeObjectURL(url);});
})();

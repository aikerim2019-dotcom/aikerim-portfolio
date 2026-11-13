(()=>{
 const boxes=()=>[...document.querySelectorAll('[data-item-attachments]')];
 function privateImage(image,doc){window.portfolioImageSource(image,doc);}
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 function bind(){for(const box of boxes()){
  const card=box.closest('[data-item-id]');if(card&&!card.dataset.drawerBound){card.dataset.drawerBound='true';card.addEventListener('click',event=>{if(event.defaultPrevented||event.target.closest('a,button,input,select,textarea,summary,details,label,[role=button]')||window.getSelection()?.toString())return;box.open=!box.open;});}

  for(const link of box.querySelectorAll('[data-item-kind]')){link.href='#';link.removeAttribute('target');link.onclick=e=>{e.preventDefault();window.PortfolioAdmin.upload(box.dataset.itemAttachments,link.dataset.itemKind);};}
  const manage=box.querySelector('[data-item-manage]');manage.href='#';manage.removeAttribute('target');manage.textContent='Осы ұяшықты басқару';manage.onclick=e=>{e.preventDefault();window.PortfolioAdmin.manage(box.dataset.itemAttachments);};
 }}
 bind();
 function render(documents){bind();
  const connected=window.PortfolioAdmin.connected;for(const box of boxes()){const files=box.querySelector('.item-files'),entries=documents.filter(d=>d.item===box.dataset.itemAttachments);files.replaceChildren();box.querySelector('.item-count').textContent=entries.length+' файл';box.querySelector('.item-empty').hidden=entries.length>0;let index=0;
   for(const doc of entries){index++;const item=make('div','item-file');item.dataset.fileId=doc.id;item.dataset.searchText=[doc.title,doc.name,doc.description,doc.year].join(' ').toLocaleLowerCase();
    if(doc.type.startsWith('image/')&&doc.storage!=='chunked'){const button=make('button','item-image-button');button.type='button';button.setAttribute('aria-label',doc.title+' фотосын ашу');const img=make('img');privateImage(img,doc);img.alt=doc.title;img.loading='lazy';button.append(img);button.onclick=()=>window.openPortfolioDocument(doc);item.append(button);}
    const heading=make('div','item-file-heading');heading.append(make('span','item-file-order',String(index)),make('span','item-file-title',doc.title));item.append(heading,make('p','item-file-meta',doc.name+' · '+(doc.size/1024/1024).toFixed(2)+' МБ'));
    const actions=make('div','item-file-actions'),open=make('button','',doc.type.startsWith('image/')?'Фотоны ашу':'Құжатты ашу'),download=make('a','','Жүктеп алу'),del=make('button','item-delete','Жою');open.type=del.type='button';open.onclick=()=>window.openPortfolioDocument(doc);download.href='#';download.download=doc.name;download.onclick=e=>window.PortfolioAdmin.download(doc,e);del.setAttribute('aria-label',doc.name+' файлын жою');del.onclick=()=>window.requestPortfolioDelete(doc);actions.append(open);if(connected)actions.append(download,del);item.append(actions,make('p','file-progress'));files.append(item);
   }
  }
  const search=document.querySelector('#learning-search');if(search){const box=document.querySelector('[data-item-attachments=student-learning-library]');search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase();if(q)box.open=true;const rows=[...box.querySelectorAll('.item-file')];let count=0;for(const row of rows){row.hidden=!row.dataset.searchText.includes(q);if(!row.hidden)count++;}box.querySelector('.item-count').textContent=q?count+' / '+rows.length+' файл':rows.length+' файл';const empty=box.querySelector('.item-empty');empty.hidden=count>0;empty.textContent=q?'Іздеуге сәйкес материал табылмады.':'Оқытушы материал қосқаннан кейін файлдар осы жерде көрінеді.';};search.oninput();}
  const portrait=documents.find(d=>d.item==='profile-photo'&&d.type.startsWith('image/')&&d.storage!=='chunked'),image=document.querySelector('#profile-photo'),drawer=document.querySelector('[data-item-attachments="profile-photo"]');
  if(image&&drawer){image.removeAttribute('crossorigin');image.removeAttribute('src');image.hidden=!portrait;const placeholder=document.querySelector('#profile-placeholder');if(placeholder)placeholder.hidden=!!portrait;if(portrait)privateImage(image,portrait);image.alt=portrait?.title||'Кусанова Айкерим Максутовна';image.style.cursor='pointer';image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label','Фото материалдары');image.setAttribute('aria-expanded',String(drawer.open));const toggle=event=>{event?.stopPropagation();drawer.open=!drawer.open;};image.onclick=toggle;image.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(event);}};drawer.ontoggle=()=>image.setAttribute('aria-expanded',String(drawer.open));}

 }
 document.addEventListener('portfolio-cards-rendered',()=>{bind();render(window.getPortfolioDocuments?.()||[]);});
 document.addEventListener('portfolio-documents-changed',e=>render(e.detail));
 const initial=window.getPortfolioDocuments?.();if(initial?.length)render(initial);
})();

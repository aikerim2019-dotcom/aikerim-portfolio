(()=>{
 const boxes=[...document.querySelectorAll('[data-item-attachments]')],originalPortrait=document.querySelector('#profile-photo')?.getAttribute('src');
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
 for(const box of boxes){
  for(const link of box.querySelectorAll('[data-item-kind]')){link.href='#';link.removeAttribute('target');link.onclick=e=>{e.preventDefault();window.PortfolioAdmin.upload(box.dataset.itemAttachments,link.dataset.itemKind);};}
  const manage=box.querySelector('[data-item-manage]');manage.href='#';manage.removeAttribute('target');manage.textContent='Осы ұяшықты басқару';manage.onclick=e=>{e.preventDefault();window.PortfolioAdmin.manage(box.dataset.itemAttachments);};
 }
 function render(documents){
  for(const box of boxes){const files=box.querySelector('.item-files'),entries=documents.filter(d=>d.item===box.dataset.itemAttachments);files.replaceChildren();box.querySelector('.item-count').textContent=entries.length+' файл';box.querySelector('.item-empty').hidden=entries.length>0;let index=0;
   for(const doc of entries){index++;const item=make('div','item-file');item.dataset.searchText=[doc.title,doc.name,doc.description,doc.year].join(' ').toLocaleLowerCase();
    if(doc.type.startsWith('image/')){const button=make('button','item-image-button');button.type='button';button.setAttribute('aria-label',doc.title+' фотосын ашу');const img=make('img');img.src=window.PortfolioAdmin.thumbnail(doc);img.alt=doc.title;img.loading='lazy';button.append(img);button.onclick=()=>window.openPortfolioDocument(doc);item.append(button);}
    const heading=make('div','item-file-heading');heading.append(make('span','item-file-order',String(index)),make('span','item-file-title',doc.title));item.append(heading,make('p','item-file-meta',doc.name+' · '+(doc.size/1024/1024).toFixed(2)+' МБ'));
    const actions=make('div','item-file-actions'),open=make('button','',doc.type.startsWith('image/')?'Фотоны ашу':'Құжатты ашу'),download=make('a','','Жүктеп алу'),del=make('button','item-delete','Жою');open.type=del.type='button';open.onclick=()=>window.openPortfolioDocument(doc);download.href=doc.href;download.download=doc.name;download.onclick=e=>window.PortfolioAdmin.download(doc,e);del.setAttribute('aria-label',doc.name+' файлын жою');del.onclick=()=>window.requestPortfolioDelete(doc);actions.append(open,download,del);item.append(actions);files.append(item);
   }
  }
  const search=document.querySelector('#learning-search');if(search){const box=document.querySelector('[data-item-attachments=student-learning-library]');search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase(),rows=[...box.querySelectorAll('.item-file')];let count=0;for(const row of rows){row.hidden=!row.dataset.searchText.includes(q);if(!row.hidden)count++;}box.querySelector('.item-count').textContent=q?count+' / '+rows.length+' файл':rows.length+' файл';const empty=box.querySelector('.item-empty');empty.hidden=count>0;empty.textContent=q?'Іздеуге сәйкес материал табылмады.':'Оқытушы материал қосқаннан кейін файлдар осы жерде көрінеді.';};search.oninput();}
  const portrait=documents.find(d=>d.item==='profile-photo'&&d.type.startsWith('image/'));if(portrait){const img=document.querySelector('#profile-photo');img.removeAttribute('crossorigin');img.src=window.PortfolioAdmin.thumbnail(portrait);img.alt=portrait.title;img.style.cursor='zoom-in';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Портретті үлкейтіп ашу');img.onclick=()=>window.openPortfolioDocument(portrait);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openPortfolioDocument(portrait);}};}else if(originalPortrait){const img=document.querySelector('#profile-photo');img.src=originalPortrait;img.onclick=img.onkeydown=null;img.removeAttribute('tabindex');img.removeAttribute('role');img.removeAttribute('aria-label');img.style.cursor='';}
 }
 document.addEventListener('portfolio-documents-changed',e=>render(e.detail));
 const initial=window.getPortfolioDocuments?.();if(initial?.length)render(initial);
})();

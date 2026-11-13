(()=>{
 const boxes=[...document.querySelectorAll('[data-item-attachments]')];
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 async function init(){
  try{const r=await fetch('./config.json');if(!r.ok)throw Error();const config=await r.json();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository||''))throw Error();const base='https://github.com/'+config.repository,branch=encodeURIComponent(config.branch);
   for(const box of boxes){const path='documents/items/'+box.dataset.itemAttachments;for(const link of box.querySelectorAll('[data-item-kind]'))link.href=base+'/upload/'+branch+'/'+path+'/'+link.dataset.itemKind;box.querySelector('[data-item-manage]').href=base+'/tree/'+branch+'/'+path;}
  }catch{for(const box of boxes)box.querySelector('.item-files').append(make('p','item-error','Жүктеу сілтемелері ашылмады. Бетті жаңартыңыз.'));}
  try{const r=await fetch('./documents.json');if(!r.ok)throw Error();const {documents}=await r.json();
   for(const box of boxes){const files=box.querySelector('.item-files'),entries=documents.filter(d=>d.item===box.dataset.itemAttachments);box.querySelector('.item-count').textContent=entries.length+' файл';box.querySelector('.item-empty').hidden=entries.length>0;for(const doc of entries){
    const item=make('div','item-file');item.dataset.searchText=[doc.title,doc.name,doc.description,doc.year].join(' ').toLocaleLowerCase();if(doc.type.startsWith('image/')){const button=make('button','item-image-button');button.type='button';button.setAttribute('aria-label',doc.title+' фотосын ашу');const img=make('img');img.src=doc.href;img.alt=doc.title;img.loading='lazy';button.append(img);button.onclick=()=>window.openPortfolioDocument(doc);item.append(button);}
    item.append(make('span','item-file-title',doc.title));const actions=make('div','item-file-actions'),open=make('button','',doc.type.startsWith('image/')?'Фотоны ашу':'Құжатты ашу'),download=make('a','','Жүктеп алу');open.type='button';open.onclick=()=>window.openPortfolioDocument(doc);download.href=doc.href;download.download=doc.name;actions.append(open,download);item.append(actions);files.append(item);
   }}
   const search=document.querySelector('#learning-search');if(search){const box=document.querySelector('[data-item-attachments=student-learning-library]');search.oninput=()=>{const q=search.value.trim().toLocaleLowerCase(),rows=[...box.querySelectorAll('.item-file')];let count=0;for(const row of rows){row.hidden=!row.dataset.searchText.includes(q);if(!row.hidden)count++;}box.querySelector('.item-count').textContent=q?count+' / '+rows.length+' файл':rows.length+' файл';const empty=box.querySelector('.item-empty');empty.hidden=count>0;empty.textContent=q?'Іздеуге сәйкес материал табылмады.':'Оқытушы материал қосқаннан кейін файлдар осы жерде көрінеді.';};}
   const portrait=documents.find(d=>d.item==='profile-photo'&&d.type.startsWith('image/'));if(portrait){const img=document.querySelector('#profile-photo');img.removeAttribute('crossorigin');img.src=portrait.href;img.alt=portrait.title;img.style.cursor='zoom-in';img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','Портретті үлкейтіп ашу');img.onclick=()=>window.openPortfolioDocument(portrait);img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openPortfolioDocument(portrait)}};}
  }catch{for(const box of boxes)box.querySelector('.item-files').append(make('p','item-error','Файлдарды ашу сәтсіз аяқталды. Бетті жаңартып көріңіз.'));}
 }
 init();
})();

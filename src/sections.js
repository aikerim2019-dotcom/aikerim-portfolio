(()=>{
 const blocks=[...document.querySelectorAll('[data-attachment-section]')];
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e};
 async function init(){
  let config;
  try{const r=await fetch('./config.json');if(!r.ok)throw Error();config=await r.json();if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository||''))throw Error();
   const base='https://github.com/'+config.repository,branch=encodeURIComponent(config.branch);
   for(const block of blocks){const path='documents/sections/'+block.dataset.attachmentSection;
    for(const link of block.querySelectorAll('[data-add-kind]'))link.href=base+'/upload/'+branch+'/'+path+'/'+link.dataset.addKind;
    block.querySelector('[data-manage-section]').href=base+'/tree/'+branch+'/'+path;
   }
  }catch{for(const block of blocks)block.querySelector('.attachment-help').textContent='Қосу сілтемелері уақытша жүктелмеді. Бетті жаңартыңыз.';}
  try{const response=await fetch('./documents.json');if(!response.ok)throw Error();const {documents}=await response.json();
   for(const block of blocks){const entries=documents.filter(d=>d.section===block.dataset.attachmentSection),grid=block.querySelector('.attachment-grid'),status=block.querySelector('.attachment-status');
    grid.replaceChildren();status.textContent=entries.length?entries.length+' материал':'Бұл бөлімге әлі материал қосылмаған. Құжат немесе фото қосу батырмасын пайдаланыңыз.';
    for(const doc of entries){const card=make('article','attachment-card');
     if(doc.type.startsWith('image/')){const button=make('button','attachment-photo');button.type='button';button.setAttribute('aria-label',doc.title+' фотосын ашу');const image=make('img');image.src=doc.href;image.alt=doc.title;image.loading='lazy';button.append(image);button.onclick=()=>window.openPortfolioDocument(doc);card.append(button)}else card.append(make('span','attachment-file-icon',doc.name.split('.').pop().toUpperCase()));
     card.append(make('h4','',doc.title),make('p','',(doc.year?doc.year+' · ':'')+(doc.size/1024/1024).toFixed(2)+' МБ'));
     const actions=make('div','doc-actions'),open=make('button','doc-btn','Ашу'),download=make('a','doc-btn doc-secondary','Жүктеп алу');open.type='button';open.onclick=()=>window.openPortfolioDocument(doc);download.href=doc.href;download.download=doc.name;actions.append(open,download);card.append(actions);grid.append(card);
    }
   }
   const portrait=documents.find(d=>d.section==='home'&&d.type.startsWith('image/'));if(portrait){const image=document.querySelector('#profile-photo');image.removeAttribute('crossorigin');image.src=portrait.href;image.alt=portrait.title;image.style.cursor='zoom-in';image.tabIndex=0;image.setAttribute('role','button');image.setAttribute('aria-label','Портретті үлкейтіп ашу');image.onclick=()=>window.openPortfolioDocument(portrait);image.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();window.openPortfolioDocument(portrait)}};}
  }catch{for(const block of blocks)block.querySelector('.attachment-status').textContent='Материалдарды жүктеу сәтсіз аяқталды. Бетті жаңартып көріңіз.';}
 }
 init();
})();

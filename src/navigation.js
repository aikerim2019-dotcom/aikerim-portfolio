(()=>{
 const titles={home:'Басты бет',about:'Мен туралы',experience:'Педагогикалық тәжірибе',materials:'Әдістемелік қор',learning:'Оқу қоржыны',achievements:'Жетістіктер',students:'Студенттер жетістігі',documents:'Құжаттар қоры',contact:'Байланыс'};
 const sections=[...document.querySelectorAll('[data-portfolio-view]')],main=document.querySelector('#portfolio-main'),menu=document.querySelector('#mobile-menu'),toggle=document.querySelector('#mobile-menu-btn'),originalTitle=document.title;
 let active=null;
 function fromHash(){try{const id=decodeURIComponent(location.hash.slice(1));return titles[id]?id:'home';}catch{return 'home';}}
 function show(id,options={}){
  if(!titles[id])id='home';const mode=options.historyMode||'push',changed=id!==active;
  if(mode!=='none'&&location.hash!=='#'+id)history[mode==='replace'?'replaceState':'pushState']({section:id},'',location.pathname+location.search+'#'+id);
  document.documentElement.dataset.view=id;for(const section of sections)section.hidden=section.id!==id;main.hidden=id==='home';active=id;
  for(const link of document.querySelectorAll('[data-view-link]')){if(link.hash==='#'+id)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
  menu.classList.add('hidden');toggle.setAttribute('aria-expanded','false');document.title=id==='home'?originalTitle:titles[id]+' — Кусанова А.М.';
  if(changed&&options.scroll!==false)window.scrollTo({top:0,behavior:'instant'});
  if(changed&&options.focus!==false){const heading=document.querySelector('#'+id+' h1, #'+id+' h2');if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});}}
  if(changed)document.dispatchEvent(new CustomEvent('portfolio-view-changed',{detail:{section:id}}));
 }
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const link=event.target.closest('a[href]');if(!link||link.target==='_blank')return;const url=new URL(link.href,location.href);if(url.origin!==location.origin||url.pathname!==location.pathname||url.search!==location.search)return;
  let id;try{id=decodeURIComponent(url.hash.slice(1));}catch{return;}if(!titles[id])return;event.preventDefault();show(id);
 });
 window.addEventListener('hashchange',()=>show(fromHash(),{historyMode:'none'}));
 window.addEventListener('popstate',()=>show(fromHash(),{historyMode:'none'}));
 toggle.setAttribute('aria-controls','mobile-menu');toggle.setAttribute('aria-expanded','false');toggle.addEventListener('click',()=>toggle.setAttribute('aria-expanded',String(!menu.classList.contains('hidden'))));
 window.PortfolioNavigation={show,get active(){return active;}};
 show(fromHash(),{historyMode:'replace',focus:false});
 window.addEventListener('load',()=>window.scrollTo({top:0,behavior:'instant'}),{once:true});
})();
